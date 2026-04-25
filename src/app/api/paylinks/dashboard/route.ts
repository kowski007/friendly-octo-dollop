import { NextResponse, type NextRequest } from "next/server";

import { verifySessionToken } from "@/lib/session";
import { logApiUsage } from "@/lib/adminStore";
import { getPaylinksDashboard } from "@/lib/paylinks";

export async function GET(req: NextRequest) {
  const started = Date.now();
  const clientKey = req.headers.get("x-nt-api-key") ?? undefined;
  let status = 200;

  try {
    const token = req.cookies.get("nt_session")?.value || "";
    const payload = token ? verifySessionToken(token) : null;
    if (!payload) {
      status = 401;
      return NextResponse.json(
        { error: "unauthorized" },
        { status, headers: { "Cache-Control": "no-store" } }
      );
    }

    const data = await getPaylinksDashboard(payload.uid);
    status = 200;
    return NextResponse.json(
      { ok: true, ...data },
      { status, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    status = message === "database_not_configured" ? 503 : 500;
    return NextResponse.json(
      { error: message },
      { status, headers: { "Cache-Control": "no-store" } }
    );
  } finally {
    await logApiUsage({
      endpoint: "/api/paylinks/dashboard",
      method: "GET",
      status,
      latencyMs: Date.now() - started,
      clientKey,
    }).catch(() => null);
  }
}
