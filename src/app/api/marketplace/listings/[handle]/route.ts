import { NextResponse, type NextRequest } from "next/server";

import {
  getMarketplaceListingByHandle,
  logApiUsage,
  updateMarketplaceListing,
} from "@/lib/adminStore";
import { verifySessionToken } from "@/lib/session";

type Context = {
  params: Promise<{ handle: string }>;
};

export async function GET(req: NextRequest, { params }: Context) {
  const started = Date.now();
  const clientKey = req.headers.get("x-nt-api-key") ?? undefined;
  const { handle } = await params;
  const listing = await getMarketplaceListingByHandle(handle);
  const status = listing ? 200 : 404;
  const res = NextResponse.json(
    listing ? { ok: true, listing } : { error: "listing_not_found" },
    { status, headers: { "Cache-Control": "no-store" } }
  );

  await logApiUsage({
    endpoint: "/api/marketplace/listings/[handle]",
    method: "GET",
    status,
    latencyMs: Date.now() - started,
    clientKey,
    handle,
  });

  return res;
}

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
        endpoint: "/api/marketplace/listings/[handle]",
        method: "PATCH",
        status,
        latencyMs: Date.now() - started,
        clientKey,
      });
      return res;
    }

    const { handle } = await params;
    const body = (await req.json().catch(() => null)) as
      | {
          status?: "active" | "paused" | "withdrawn";
          askAmount?: number | null;
          minOfferAmount?: number | null;
          sellerNote?: string | null;
        }
      | null;

    const listing = await updateMarketplaceListing({
      userId: payload.uid,
      handle,
      status: body?.status,
      askAmount: body?.askAmount,
      minOfferAmount: body?.minOfferAmount,
      sellerNote: body?.sellerNote,
    });

    const res = NextResponse.json(
      { ok: true, listing },
      { headers: { "Cache-Control": "no-store" } }
    );
    await logApiUsage({
      endpoint: "/api/marketplace/listings/[handle]",
      method: "PATCH",
      status: 200,
      latencyMs: Date.now() - started,
      clientKey,
      handle,
    });
    return res;
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    status =
      message === "missing_handle" ||
      message === "invalid_listing_status" ||
      message === "invalid_ask_amount" ||
      message === "invalid_min_offer_amount"
        ? 400
        : message === "listing_locked_for_review"
          ? 409
        : message === "listing_not_found"
          ? 404
          : 500;
    const res = NextResponse.json(
      { error: message },
      { status, headers: { "Cache-Control": "no-store" } }
    );
    await logApiUsage({
      endpoint: "/api/marketplace/listings/[handle]",
      method: "PATCH",
      status,
      latencyMs: Date.now() - started,
      clientKey,
    });
    return res;
  }
}
