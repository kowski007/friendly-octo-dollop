import { NextResponse, type NextRequest } from "next/server";

import { classifyHandleAvailability, logApiUsage } from "@/lib/adminStore";

export async function GET(req: NextRequest) {
  const started = Date.now();
  const clientKey = req.headers.get("x-nt-api-key") ?? undefined;
  const handle = req.nextUrl.searchParams.get("handle") ?? "";

  const result = await classifyHandleAvailability(handle);
  const status = result.status === "invalid" ? 400 : 200;

  const response = NextResponse.json(result, {
    status,
    headers: { "Cache-Control": "no-store" },
  });

  await logApiUsage({
    endpoint: "/api/handles/availability",
    method: "GET",
    status,
    latencyMs: Date.now() - started,
    handle: result.handle || undefined,
    clientKey,
  });

  return response;
}
