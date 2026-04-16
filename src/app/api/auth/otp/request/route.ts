import { NextResponse, type NextRequest } from "next/server";

import { logApiUsage, requestPhoneOtp } from "@/lib/adminStore";

function getIp(req: NextRequest) {
  const fwd = req.headers.get("x-forwarded-for");
  if (!fwd) return undefined;
  return fwd.split(",")[0]?.trim() || undefined;
}

export async function POST(req: NextRequest) {
  const started = Date.now();
  const clientKey = req.headers.get("x-nt-api-key") ?? undefined;
  const userAgent = req.headers.get("user-agent") ?? undefined;
  const ip = getIp(req);

  let status = 200;

  try {
    const body = (await req.json().catch(() => null)) as
      | { phone?: string }
      | null;
    const phone = body?.phone ?? "";

    const result = await requestPhoneOtp({ phone, ip, userAgent });

    const payload: Record<string, unknown> = {
      ok: true,
      phone: result.phone,
    };
    if (result.devCode) payload.devOtp = result.devCode;

    status = 200;
    const res = NextResponse.json(payload, {
      status,
      headers: { "Cache-Control": "no-store" },
    });

    await logApiUsage({
      endpoint: "/api/auth/otp/request",
      method: "POST",
      status,
      latencyMs: Date.now() - started,
      clientKey,
    });

    return res;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown_error";
    status = msg === "invalid_phone" ? 400 : 500;

    const res = NextResponse.json(
      { error: msg },
      { status, headers: { "Cache-Control": "no-store" } }
    );

    await logApiUsage({
      endpoint: "/api/auth/otp/request",
      method: "POST",
      status,
      latencyMs: Date.now() - started,
      clientKey,
    });

    return res;
  }
}

