import { NextResponse, type NextRequest } from "next/server";

import { logApiUsage, respondToMarketplaceOffer } from "@/lib/adminStore";
import { verifySessionToken } from "@/lib/session";

type Context = {
  params: Promise<{ offerId: string }>;
};

export async function PATCH(req: NextRequest, { params }: Context) {
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
        endpoint: "/api/marketplace/offers/[offerId]",
        method: "PATCH",
        status,
        latencyMs: Date.now() - started,
        clientKey,
      });
      return res;
    }

    const { offerId } = await params;
    const body = (await req.json().catch(() => null)) as
      | { action?: "accept" | "reject" }
      | null;

    const action = body?.action;
    if (!action || !["accept", "reject"].includes(action)) {
      throw new Error("invalid_offer_action");
    }

    const result = await respondToMarketplaceOffer({
      userId: payload.uid,
      offerId,
      action,
    });

    const res = NextResponse.json(
      { ok: true, ...result },
      { headers: { "Cache-Control": "no-store" } }
    );
    await logApiUsage({
      endpoint: "/api/marketplace/offers/[offerId]",
      method: "PATCH",
      status: 200,
      latencyMs: Date.now() - started,
      clientKey,
      handle: result.listing?.listing.handle,
    });
    return res;
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    status =
      message === "invalid_offer_action"
        ? 400
        : message === "offer_not_found" || message === "listing_not_found"
          ? 404
          : message === "offer_not_pending"
            ? 409
            : 500;

    const res = NextResponse.json(
      { error: message },
      { status, headers: { "Cache-Control": "no-store" } }
    );
    await logApiUsage({
      endpoint: "/api/marketplace/offers/[offerId]",
      method: "PATCH",
      status,
      latencyMs: Date.now() - started,
      clientKey,
    });
    return res;
  }
}
