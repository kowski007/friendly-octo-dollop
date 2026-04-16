import { NextResponse, type NextRequest } from "next/server";

import { claimHandleForUser, logApiUsage } from "@/lib/adminStore";
import { verifySessionToken } from "@/lib/session";

export async function POST(req: NextRequest) {
  const started = Date.now();
  const clientKey = req.headers.get("x-nt-api-key") ?? undefined;

  let status = 200;

  try {
    const token = req.cookies.get("nt_session")?.value || "";
    const payload = token ? verifySessionToken(token) : null;
    if (!payload) {
      status = 401;
      const res = NextResponse.json(
        { error: "unauthorized" },
        { status, headers: { "Cache-Control": "no-store" } }
      );
      await logApiUsage({
        endpoint: "/api/handles/claim",
        method: "POST",
        status,
        latencyMs: Date.now() - started,
        clientKey,
      });
      return res;
    }

    const body = (await req.json().catch(() => null)) as
      | { handle?: string }
      | null;
    const handle = body?.handle ?? "";

    const claim = await claimHandleForUser({ userId: payload.uid, handle });
    status = 201;
    const res = NextResponse.json(
      { ok: true, claim },
      { status, headers: { "Cache-Control": "no-store" } }
    );

    await logApiUsage({
      endpoint: "/api/handles/claim",
      method: "POST",
      status,
      latencyMs: Date.now() - started,
      clientKey,
      handle: claim.handle,
    });

    return res;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown_error";
    // @ts-expect-error code attached in store for API routes
    const code = err?.code as string | undefined;

    status =
      code === "already_claimed" || msg === "already_claimed"
        ? 409
        : code === "user_already_has_handle" || msg === "user_already_has_handle"
          ? 409
          : msg === "missing_handle" || msg === "invalid_handle"
            ? 400
            : msg === "phone_not_verified" || msg === "user_not_found"
              ? 401
              : 500;

    const res = NextResponse.json(
      { error: msg },
      { status, headers: { "Cache-Control": "no-store" } }
    );

    await logApiUsage({
      endpoint: "/api/handles/claim",
      method: "POST",
      status,
      latencyMs: Date.now() - started,
      clientKey,
    });

    return res;
  }
}

