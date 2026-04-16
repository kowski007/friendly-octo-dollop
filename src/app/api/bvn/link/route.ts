import { NextResponse, type NextRequest } from "next/server";

import { linkBvnForUser, logApiUsage } from "@/lib/adminStore";
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
        endpoint: "/api/bvn/link",
        method: "POST",
        status,
        latencyMs: Date.now() - started,
        clientKey,
      });
      return res;
    }

    const body = (await req.json().catch(() => null)) as
      | { bvn?: string; fullName?: string }
      | null;
    const bvn = body?.bvn ?? "";
    const fullName = body?.fullName ?? undefined;

    const { user, claim } = await linkBvnForUser({
      userId: payload.uid,
      bvn,
      fullName,
    });

    status = 200;
    const res = NextResponse.json(
      { ok: true, user, claim },
      { status, headers: { "Cache-Control": "no-store" } }
    );

    await logApiUsage({
      endpoint: "/api/bvn/link",
      method: "POST",
      status,
      latencyMs: Date.now() - started,
      clientKey,
      handle: claim?.handle ?? undefined,
    });

    return res;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown_error";
    status =
      msg === "invalid_bvn"
        ? 400
        : msg === "user_not_found"
          ? 401
          : 500;

    const res = NextResponse.json(
      { error: msg },
      { status, headers: { "Cache-Control": "no-store" } }
    );

    await logApiUsage({
      endpoint: "/api/bvn/link",
      method: "POST",
      status,
      latencyMs: Date.now() - started,
      clientKey,
    });

    return res;
  }
}

