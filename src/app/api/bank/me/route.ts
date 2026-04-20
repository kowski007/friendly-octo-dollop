import { NextResponse, type NextRequest } from "next/server";

import {
  getBankAccountForUser,
  getClaimByUserId,
  getUserById,
  logApiUsage,
} from "@/lib/adminStore";
import { verifySessionToken } from "@/lib/session";

export async function GET(req: NextRequest) {
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
        endpoint: "/api/bank/me",
        method: "GET",
        status,
        latencyMs: Date.now() - started,
        clientKey,
      });
      return res;
    }

    const [user, claim, bankAccount] = await Promise.all([
      getUserById(payload.uid),
      getClaimByUserId(payload.uid),
      getBankAccountForUser(payload.uid),
    ]);

    if (!user) {
      status = 401;
      const res = NextResponse.json(
        { error: "unauthorized" },
        { status, headers: { "Cache-Control": "no-store" } }
      );
      await logApiUsage({
        endpoint: "/api/bank/me",
        method: "GET",
        status,
        latencyMs: Date.now() - started,
        clientKey,
      });
      return res;
    }

    const res = NextResponse.json(
      { ok: true, user, claim, bankAccount },
      { status, headers: { "Cache-Control": "no-store" } }
    );

    await logApiUsage({
      endpoint: "/api/bank/me",
      method: "GET",
      status,
      latencyMs: Date.now() - started,
      clientKey,
      handle: claim?.handle ?? undefined,
    });

    return res;
  } catch (error) {
    status = 500;
    const res = NextResponse.json(
      { error: error instanceof Error ? error.message : "unknown_error" },
      { status, headers: { "Cache-Control": "no-store" } }
    );

    await logApiUsage({
      endpoint: "/api/bank/me",
      method: "GET",
      status,
      latencyMs: Date.now() - started,
      clientKey,
    });

    return res;
  }
}
