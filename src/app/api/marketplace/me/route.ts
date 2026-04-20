import { NextResponse, type NextRequest } from "next/server";

import { getMarketplaceDashboardForUser, logApiUsage } from "@/lib/adminStore";
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
      endpoint: "/api/marketplace/me",
      method: "GET",
      status: 401,
      latencyMs: Date.now() - started,
      clientKey,
    });
    return res;
  }

  const dashboard = await getMarketplaceDashboardForUser(payload.uid);
  const res = NextResponse.json(
    { ok: true, ...dashboard },
    { headers: { "Cache-Control": "no-store" } }
  );
  await logApiUsage({
    endpoint: "/api/marketplace/me",
    method: "GET",
    status: 200,
    latencyMs: Date.now() - started,
    clientKey,
    handle: dashboard.claim?.handle,
  });
  return res;
}
