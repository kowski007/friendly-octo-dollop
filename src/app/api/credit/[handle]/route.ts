import { NextResponse, type NextRequest } from "next/server";

import { getCreditProfileForHandle, logApiUsage } from "@/lib/adminStore";

type Context = {
  params: Promise<{ handle: string }>;
};

export async function GET(req: NextRequest, { params }: Context) {
  const started = Date.now();
  const clientKey = req.headers.get("x-nt-api-key") ?? undefined;
  const { handle } = await params;
  const creditProfile = await getCreditProfileForHandle(handle);
  const status = creditProfile ? 200 : 404;

  const res = NextResponse.json(
    creditProfile ? { ok: true, creditProfile } : { error: "handle_not_found" },
    { status, headers: { "Cache-Control": "no-store" } }
  );

  await logApiUsage({
    endpoint: "/api/credit/[handle]",
    method: "GET",
    status,
    latencyMs: Date.now() - started,
    clientKey,
    handle,
  });

  return res;
}
