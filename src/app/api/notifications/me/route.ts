import { NextResponse, type NextRequest } from "next/server";

import {
  listNotifications,
  logApiUsage,
  markNotificationsRead,
} from "@/lib/adminStore";
import { verifySessionToken } from "@/lib/session";

export async function GET(req: NextRequest) {
  const started = Date.now();
  const clientKey = req.headers.get("x-nt-api-key") ?? undefined;
  const token = req.cookies.get("nt_session")?.value || "";
  const payload = token ? verifySessionToken(token) : null;

  if (!payload) {
    const res = NextResponse.json(
      { error: "unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
    await logApiUsage({
      endpoint: "/api/notifications/me",
      method: "GET",
      status: 401,
      latencyMs: Date.now() - started,
      clientKey,
    });
    return res;
  }

  const limit = Math.min(
    Math.max(Number(req.nextUrl.searchParams.get("limit") || "20"), 1),
    100
  );
  const unreadOnly = req.nextUrl.searchParams.get("unread") === "1";
  const data = await listNotifications({
    userId: payload.uid,
    limit,
    unreadOnly,
  });
  const res = NextResponse.json(
    { ok: true, ...data },
    { headers: { "Cache-Control": "no-store" } }
  );

  await logApiUsage({
    endpoint: "/api/notifications/me",
    method: "GET",
    status: 200,
    latencyMs: Date.now() - started,
    clientKey,
  });

  return res;
}

export async function PATCH(req: NextRequest) {
  const token = req.cookies.get("nt_session")?.value || "";
  const payload = token ? verifySessionToken(token) : null;
  if (!payload) {
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  const body = (await req.json().catch(() => null)) as
    | { ids?: string[] }
    | null;
  const result = await markNotificationsRead({
    userId: payload.uid,
    notificationIds: Array.isArray(body?.ids) ? body.ids : undefined,
  });

  return NextResponse.json(
    { ok: true, ...result },
    { headers: { "Cache-Control": "no-store" } }
  );
}
