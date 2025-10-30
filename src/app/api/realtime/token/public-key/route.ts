import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/lib/auth";
import { REALTIME_ENV } from "@/lib/realtime/core/config";

export async function GET(request: NextRequest) {
  try {
    await AuthService.requireAuth(request, { requireSession: true });
    if (!REALTIME_ENV.vapidPublicKey) {
      return NextResponse.json({ error: "VAPID_PUBLIC_KEY missing" }, { status: 500 });
    }
    return NextResponse.json({ publicKey: REALTIME_ENV.vapidPublicKey });
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}


