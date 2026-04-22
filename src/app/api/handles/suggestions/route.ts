import { NextResponse, type NextRequest } from "next/server";

import { listPublicHandleSuggestions, logApiUsage } from "@/lib/adminStore";

function toInt(value: string | null, fallback: number) {
  if (!value) return fallback;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

export async function GET(req: NextRequest) {
  const started = Date.now();
  const limit = Math.min(
    12,
    Math.max(1, toInt(req.nextUrl.searchParams.get("limit"), 5))
  );

  const data = await listPublicHandleSuggestions({ limit });
  const res = NextResponse.json(
    { ok: true, ...data },
    { headers: { "Cache-Control": "no-store" } }
  );

  await logApiUsage({
    endpoint: "/api/handles/suggestions",
    method: "GET",
    status: 200,
    latencyMs: Date.now() - started,
    clientKey: req.headers.get("x-nt-api-key") ?? undefined,
  });

  return res;
}
