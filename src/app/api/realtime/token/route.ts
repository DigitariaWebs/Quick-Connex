import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/lib/auth";
import { createRestrictedTokenRequest } from "@/lib/realtime/server/TokenService";

export async function GET(request: NextRequest) {
  try {
    const { user } = await AuthService.requireAuth(request, {
      requireSession: true,
      roles: ["employee", "manager", "admin", "super_admin"],
    });

    const tokenRequest = await createRestrictedTokenRequest((user._id as any).toString());
    return NextResponse.json(tokenRequest);
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}


