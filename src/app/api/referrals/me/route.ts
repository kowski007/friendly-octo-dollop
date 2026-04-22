import { NextResponse, type NextRequest } from "next/server";

import { getReferralDashboardForUser, logApiUsage } from "@/lib/adminStore";
import { verifySessionToken } from "@/lib/session";

export async function GET(req: NextRequest) {
  const started = Date.now();
  const clientKey = req.headers.get("x-nt-api-key") ?? undefined;

  const token = req.cookies.get("nt_session")?.value || "";
  const payload = token ? verifySessionToken(token) : null;
  if (!payload) {
    const res = NextResponse.json(
      { error: "unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
    await logApiUsage({
      endpoint: "/api/referrals/me",
      method: "GET",
      status: 401,
      latencyMs: Date.now() - started,
      clientKey,
    });
    return res;
  }

  const dashboard = await getReferralDashboardForUser(payload.uid);
  const res = NextResponse.json(
    { ok: true, ...dashboard },
    { headers: { "Cache-Control": "no-store" } }
  );
  await logApiUsage({
    endpoint: "/api/referrals/me",
    method: "GET",
    status: 200,
    latencyMs: Date.now() - started,
    clientKey,
  });
  return res;
}
