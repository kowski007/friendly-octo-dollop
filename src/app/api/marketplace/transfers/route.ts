import { NextResponse, type NextRequest } from "next/server";

import { listMarketplaceTransfers, logApiUsage } from "@/lib/adminStore";
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
      endpoint: "/api/marketplace/transfers",
      method: "GET",
      status: 401,
      latencyMs: Date.now() - started,
      clientKey,
    });
    return res;
  }

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Math.max(Number(searchParams.get("limit") || "25"), 1), 100);
  const offset = Math.max(Number(searchParams.get("offset") || "0"), 0);
  const transfers = await listMarketplaceTransfers({
    limit,
    offset,
    userId: payload.uid,
  });

  const res = NextResponse.json(
    { ok: true, transfers },
    { headers: { "Cache-Control": "no-store" } }
  );
  await logApiUsage({
    endpoint: "/api/marketplace/transfers",
    method: "GET",
    status: 200,
    latencyMs: Date.now() - started,
    clientKey,
  });

  return res;
}
