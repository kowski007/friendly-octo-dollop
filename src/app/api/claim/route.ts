import { NextResponse, type NextRequest } from "next/server";

import { claimHandle, logApiUsage } from "@/lib/adminStore";

export async function POST(req: NextRequest) {
  const started = Date.now();
  let status = 200;

  try {
    const body = (await req.json().catch(() => null)) as
      | {
          handle?: string;
          displayName?: string;
          bank?: string;
          verification?: string;
        }
      | null;

    const handle = body?.handle ?? "";
    const record = await claimHandle({
      handle,
      displayName: body?.displayName,
      bank: body?.bank,
      verification:
        body?.verification === "verified" ||
        body?.verification === "business" ||
        body?.verification === "pending"
          ? body.verification
          : undefined,
      source: "api",
    });

    status = 201;
    const res = NextResponse.json(record, {
      status,
      headers: { "Cache-Control": "no-store" },
    });

    const clientKey = req.headers.get("x-nt-api-key") ?? undefined;
    await logApiUsage({
      endpoint: "/api/claim",
      method: "POST",
      status,
      latencyMs: Date.now() - started,
      handle: record.handle,
      clientKey,
    });

    return res;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown_error";
    // @ts-expect-error code attached in store for API routes
    const code = err?.code as string | undefined;

    status =
      code === "already_claimed" || msg === "already_claimed"
        ? 409
        : msg === "missing_handle" || msg === "invalid_handle"
          ? 400
          : 500;

    const res = NextResponse.json(
      { error: msg },
      { status, headers: { "Cache-Control": "no-store" } }
    );

    const clientKey = req.headers.get("x-nt-api-key") ?? undefined;
    await logApiUsage({
      endpoint: "/api/claim",
      method: "POST",
      status,
      latencyMs: Date.now() - started,
      clientKey,
    });

    return res;
  }
}
