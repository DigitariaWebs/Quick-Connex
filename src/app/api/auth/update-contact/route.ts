import { NextRequest, NextResponse } from "next/server";
import { DatabaseService } from "@/lib/database";
import User from "@/models/User";
import { rateLimit } from "@/lib/auth";
import { z } from "zod";

const schema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("email"),
    currentEmail: z.string().email(),
    newValue: z.string().email("Invalid email address"),
  }),
  z.object({
    type: z.literal("phone"),
    currentEmail: z.string().email(),
    newValue: z.string().min(7, "Invalid phone number"),
  }),
]);

export async function POST(request: NextRequest) {
  try {
    const rateLimitResult = rateLimit({
      windowMs: 15 * 60 * 1000,
      maxRequests: 10,
    })(request);

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Too many requests. Please try again later.",
          retryAfter: Math.ceil(
            (rateLimitResult.resetTime - Date.now()) / 1000,
          ),
        },
        {
          status: 429,
          headers: {
            "Retry-After": Math.ceil(
              (rateLimitResult.resetTime - Date.now()) / 1000,
            ).toString(),
          },
        },
      );
    }

    const body = await request.json();
    const validated = schema.parse(body);
    const currentEmail = validated.currentEmail.toLowerCase().trim();

    if (validated.type === "email") {
      const newEmail = validated.newValue.toLowerCase().trim();

      // Atomic: only update if the email is still unverified.
      // Returns null if no user matches OR the email was already verified —
      // we intentionally return the same generic error for both to avoid
      // leaking which case occurred (enumeration prevention).
      const updated = await DatabaseService.updateOne(
        User,
        { email: currentEmail, emailVerified: { $ne: true } },
        {
          $set: { email: newEmail, emailVerified: false },
          $unset: { emailVerifiedAt: "" },
        },
      ).catch((err: unknown) => {
        // Unique index on User.email fires E11000 when newEmail is taken.
        if (
          err &&
          typeof err === "object" &&
          "code" in err &&
          (err as { code?: number }).code === 11000
        ) {
          return "DUPLICATE" as const;
        }
        throw err;
      });

      if (updated === "DUPLICATE") {
        return NextResponse.json(
          { success: false, error: "This email address is already in use" },
          { status: 400 },
        );
      }
      if (!updated) {
        return NextResponse.json(
          { success: false, error: "Unable to update email" },
          { status: 400 },
        );
      }
    } else {
      const newPhone = validated.newValue;

      // phone has a non-unique index, so we must check uniqueness explicitly.
      // Combine the user lookup and uniqueness check into one $or query.
      const conflict = await DatabaseService.findOne(User, {
        $or: [{ email: currentEmail }, { phone: newPhone }],
      });

      if (!conflict || conflict.email !== currentEmail) {
        // Either no user with currentEmail, OR the matched doc is a different
        // user whose phone conflicts. Generic error in both cases.
        if (conflict && conflict.phone === newPhone) {
          return NextResponse.json(
            { success: false, error: "This phone number is already in use" },
            { status: 400 },
          );
        }
        return NextResponse.json(
          { success: false, error: "Unable to update phone number" },
          { status: 400 },
        );
      }

      // Second conflict check: the target user exists, but another user may
      // also hold newPhone. Re-run a targeted check.
      const phoneTaken = await DatabaseService.findOne(User, {
        phone: newPhone,
        _id: { $ne: conflict._id },
      });
      if (phoneTaken) {
        return NextResponse.json(
          { success: false, error: "This phone number is already in use" },
          { status: 400 },
        );
      }

      const updated = await DatabaseService.updateOne(
        User,
        { _id: conflict._id, phoneVerified: { $ne: true } },
        {
          $set: { phone: newPhone, phoneVerified: false },
          $unset: { phoneVerifiedAt: "" },
        },
      );

      if (!updated) {
        return NextResponse.json(
          { success: false, error: "Unable to update phone number" },
          { status: 400 },
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Invalid request data" },
        { status: 400 },
      );
    }
    console.error("Error updating contact:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update contact information" },
      { status: 500 },
    );
  }
}
