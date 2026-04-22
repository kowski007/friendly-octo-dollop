import { NextResponse, type NextRequest } from "next/server";

import { getPublicHandleProfile, logApiUsage } from "@/lib/adminStore";

type Context = {
  params: Promise<{ handle: string }>;
};

export async function GET(req: NextRequest, { params }: Context) {
  const started = Date.now();
  const clientKey = req.headers.get("x-nt-api-key") ?? undefined;
  const { handle } = await params;
  const profile = await getPublicHandleProfile(handle);
  const status = profile ? 200 : 404;

  const res = NextResponse.json(
    profile ? { ok: true, profile } : { error: "handle_not_found" },
    { status, headers: { "Cache-Control": "no-store" } }
  );

  await logApiUsage({
    endpoint: "/api/handles/[handle]/profile",
    method: "GET",
    status,
    latencyMs: Date.now() - started,
    clientKey,
    handle,
  });

  return res;
}
