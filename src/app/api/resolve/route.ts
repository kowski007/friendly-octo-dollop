import { NextResponse, type NextRequest } from "next/server";

import { logApiUsage, resolveHandle } from "@/lib/adminStore";

export async function GET(req: NextRequest) {
  const started = Date.now();
  const handle = req.nextUrl.searchParams.get("handle") ?? "";

  const result = await resolveHandle(handle);
  const status =
    result.status === "invalid"
      ? 400
      : result.status === "claimed"
        ? 200
        : 200;

  const res = NextResponse.json(result, {
    status,
    headers: { "Cache-Control": "no-store" },
  });

  const clientKey = req.headers.get("x-nt-api-key") ?? undefined;
  void logApiUsage({
    endpoint: "/api/resolve",
    method: "GET",
    status,
    latencyMs: Date.now() - started,
    handle: result.status === "invalid" ? undefined : result.handle,
    clientKey,
  }).catch((error) => {
    console.warn(
      "[nairatag] Failed to log /api/resolve usage:",
      error instanceof Error ? error.message : String(error)
    );
  });

  return res;
}
