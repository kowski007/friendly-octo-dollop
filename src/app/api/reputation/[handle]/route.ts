import { NextResponse, type NextRequest } from "next/server";

import { getHandleReputation, logApiUsage } from "@/lib/adminStore";

type Context = {
  params: Promise<{ handle: string }>;
};

export async function GET(req: NextRequest, { params }: Context) {
  const started = Date.now();
  const clientKey = req.headers.get("x-nt-api-key") ?? undefined;
  const { handle } = await params;
  const reputation = await getHandleReputation(handle);

  const status = reputation ? 200 : 404;
  const res = NextResponse.json(
    reputation ? { ok: true, reputation } : { error: "handle_not_found" },
    { status, headers: { "Cache-Control": "no-store" } }
  );

  await logApiUsage({
    endpoint: "/api/reputation/[handle]",
    method: "GET",
    status,
    latencyMs: Date.now() - started,
    clientKey,
    handle,
  });

  return res;
}
