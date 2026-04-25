import { NextResponse, type NextRequest } from "next/server";

import { createNotification, logApiUsage } from "@/lib/adminStore";
import { updatePaylinkStatus } from "@/lib/paylinks";
import { verifySessionToken } from "@/lib/session";

type RouteProps = {
  params: Promise<{ paylinkId: string }>;
};

export async function PATCH(req: NextRequest, { params }: RouteProps) {
  const started = Date.now();
  const clientKey = req.headers.get("x-nt-api-key") ?? undefined;
  let status = 200;

  try {
    const token = req.cookies.get("nt_session")?.value || "";
    const payload = token ? verifySessionToken(token) : null;
    if (!payload) {
      status = 401;
      return NextResponse.json(
        { error: "unauthorized" },
        { status, headers: { "Cache-Control": "no-store" } }
      );
    }

    const { paylinkId } = await params;
    const body = (await req.json().catch(() => null)) as
      | { status?: "active" | "paused" | "deleted" }
      | null;
    const nextStatus = body?.status;
    if (!nextStatus || !["active", "paused", "deleted"].includes(nextStatus)) {
      status = 400;
      return NextResponse.json(
        { error: "invalid_status" },
        { status, headers: { "Cache-Control": "no-store" } }
      );
    }

    const paylink = await updatePaylinkStatus({
      paylinkId,
      ownerId: payload.uid,
      status: nextStatus,
    });
    if (!paylink) {
      status = 404;
      return NextResponse.json(
        { error: "paylink_not_found" },
        { status, headers: { "Cache-Control": "no-store" } }
      );
    }

    await createNotification({
      userId: payload.uid,
      handle: paylink.handle,
      type: "paylink_updated",
      title: "PayLink updated",
      body:
        nextStatus === "active"
          ? `Your PayLink /pay/${paylink.shortCode} is live again.`
          : nextStatus === "paused"
            ? `Your PayLink /pay/${paylink.shortCode} has been paused.`
            : `Your PayLink /pay/${paylink.shortCode} has been removed from public use.`,
      priority: "normal",
      metadata: {
        paylinkId: paylink.id,
        shortCode: paylink.shortCode,
        status: paylink.status,
      },
    }).catch(() => null);

    status = 200;
    return NextResponse.json(
      { ok: true, paylink },
      { status, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    status = message === "database_not_configured" ? 503 : 500;
    return NextResponse.json(
      { error: message },
      { status, headers: { "Cache-Control": "no-store" } }
    );
  } finally {
    await logApiUsage({
      endpoint: "/api/paylinks/[paylinkId]",
      method: "PATCH",
      status,
      latencyMs: Date.now() - started,
      clientKey,
    }).catch(() => null);
  }
}
