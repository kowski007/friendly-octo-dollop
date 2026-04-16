import { NextResponse, type NextRequest } from "next/server";

import { getUserById, logApiUsage, verifyPhoneOtp } from "@/lib/adminStore";
import { createSessionToken } from "@/lib/session";

function getIp(req: NextRequest) {
  const fwd = req.headers.get("x-forwarded-for");
  if (!fwd) return undefined;
  return fwd.split(",")[0]?.trim() || undefined;
}

export async function POST(req: NextRequest) {
  const started = Date.now();
  const clientKey = req.headers.get("x-nt-api-key") ?? undefined;
  const ip = getIp(req);

  let status = 200;

  try {
    const body = (await req.json().catch(() => null)) as
      | { phone?: string; code?: string }
      | null;
    const phone = body?.phone ?? "";
    const code = body?.code ?? "";

    const user = await verifyPhoneOtp({ phone, code, ip });
    const token = createSessionToken({ uid: user.id, phone: user.phone });

    status = 200;
    const res = NextResponse.json(
      { ok: true, user: (await getUserById(user.id)) ?? user },
      { status, headers: { "Cache-Control": "no-store" } }
    );
    res.cookies.set("nt_session", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    await logApiUsage({
      endpoint: "/api/auth/otp/verify",
      method: "POST",
      status,
      latencyMs: Date.now() - started,
      clientKey,
    });

    return res;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown_error";
    status =
      msg === "invalid_phone" ||
      msg === "invalid_code" ||
      msg === "otp_not_found" ||
      msg === "otp_expired" ||
      msg === "otp_locked" ||
      msg === "otp_invalid"
        ? 400
        : 500;

    const res = NextResponse.json(
      { error: msg },
      { status, headers: { "Cache-Control": "no-store" } }
    );

    await logApiUsage({
      endpoint: "/api/auth/otp/verify",
      method: "POST",
      status,
      latencyMs: Date.now() - started,
      clientKey,
    });

    return res;
  }
}

