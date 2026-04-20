import { NextResponse, type NextRequest } from "next/server";

import {
  createMarketplaceListing,
  getMarketplaceStats,
  listMarketplaceListings,
  logApiUsage,
} from "@/lib/adminStore";
import { verifySessionToken } from "@/lib/session";

export async function GET(req: NextRequest) {
  const started = Date.now();
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() || undefined;
  const limit = Math.min(Math.max(Number(searchParams.get("limit") || "24"), 1), 100);
  const offset = Math.max(Number(searchParams.get("offset") || "0"), 0);
  const clientKey = req.headers.get("x-nt-api-key") ?? undefined;

  const [listings, stats] = await Promise.all([
    listMarketplaceListings({ q, limit, offset }),
    getMarketplaceStats(),
  ]);
  const res = NextResponse.json(
    { ok: true, listings, stats },
    { headers: { "Cache-Control": "no-store" } }
  );

  await logApiUsage({
    endpoint: "/api/marketplace/listings",
    method: "GET",
    status: 200,
    latencyMs: Date.now() - started,
    clientKey,
  });

  return res;
}

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
        endpoint: "/api/marketplace/listings",
        method: "POST",
        status,
        latencyMs: Date.now() - started,
        clientKey,
      });
      return res;
    }

    const body = (await req.json().catch(() => null)) as
      | {
          handle?: string;
          saleMode?: "fixed_price" | "offers_only";
          askAmount?: number;
          minOfferAmount?: number;
          sellerNote?: string;
        }
      | null;

    const listing = await createMarketplaceListing({
      userId: payload.uid,
      handle: body?.handle ?? "",
      saleMode: body?.saleMode ?? "fixed_price",
      askAmount: body?.askAmount,
      minOfferAmount: body?.minOfferAmount,
      sellerNote: body?.sellerNote,
    });

    status = 201;
    const res = NextResponse.json(
      { ok: true, listing },
      { status, headers: { "Cache-Control": "no-store" } }
    );
    await logApiUsage({
      endpoint: "/api/marketplace/listings",
      method: "POST",
      status,
      latencyMs: Date.now() - started,
      clientKey,
      handle: listing?.listing.handle,
    });

    return res;
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    status =
      message === "missing_handle" ||
      message === "invalid_handle" ||
      message === "invalid_sale_mode" ||
      message === "invalid_ask_amount" ||
      message === "invalid_min_offer_amount"
        ? 400
        : message === "unauthorized" || message === "handle_not_owned"
          ? 401
          : message.startsWith("marketplace_")
            ? 409
            : 500;

    const res = NextResponse.json(
      { error: message },
      { status, headers: { "Cache-Control": "no-store" } }
    );

    await logApiUsage({
      endpoint: "/api/marketplace/listings",
      method: "POST",
      status,
      latencyMs: Date.now() - started,
      clientKey,
    });

    return res;
  }
}
