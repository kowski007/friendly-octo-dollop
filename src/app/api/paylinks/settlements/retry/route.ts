import { NextResponse, type NextRequest } from "next/server";

import { logApiUsage } from "@/lib/adminStore";
import { runPaylinkSettlementRetryBatch } from "@/lib/paylinks";

function workerSecret() {
  return process.env.NT_WORKER_SECRET?.trim() || process.env.CRON_SECRET?.trim() || "";
}

function publicBaseUrl(req: NextRequest) {
  return (
    process.env.NT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    req.nextUrl.origin
  ).replace(/\/+$/, "");
}

function isAuthorized(req: NextRequest) {
  const expected = workerSecret();
  if (!expected) return false;
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  const header = req.headers.get("x-nt-worker-secret")?.trim();
  return bearer === expected || header === expected;
}

async function handleRetry(req: NextRequest) {
  const started = Date.now();
  const clientKey = req.headers.get("x-nt-api-key") ?? undefined;
  let status = 200;

  try {
    if (!isAuthorized(req)) {
      status = 401;
      return NextResponse.json(
        { error: "unauthorized" },
        { status, headers: { "Cache-Control": "no-store" } }
      );
    }

    const body = (await req.json().catch(() => null)) as { limit?: number } | null;
    const result = await runPaylinkSettlementRetryBatch({
      appBaseUrl: publicBaseUrl(req),
      limit:
        body?.limit && Number.isFinite(Number(body.limit))
          ? Math.min(Math.max(Math.round(Number(body.limit)), 1), 100)
          : undefined,
    });

    status = 200;
    return NextResponse.json(
      { ok: true, ...result },
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
      endpoint: "/api/paylinks/settlements/retry",
      method: "POST",
      status,
      latencyMs: Date.now() - started,
      clientKey,
    }).catch(() => null);
  }
}

export async function GET(req: NextRequest) {
  return handleRetry(req);
}

export async function POST(req: NextRequest) {
  return handleRetry(req);
}
