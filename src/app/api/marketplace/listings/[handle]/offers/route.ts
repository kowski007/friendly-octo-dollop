import { NextResponse, type NextRequest } from "next/server";

import { logApiUsage, submitMarketplaceOffer } from "@/lib/adminStore";
import { verifySessionToken } from "@/lib/session";

type Context = {
  params: Promise<{ handle: string }>;
};

export async function POST(req: NextRequest, { params }: Context) {
  const started = Date.now();
  const clientKey = req.headers.get("x-nt-api-key") ?? undefined;
  let status = 200;

  try {
    const { handle } = await params;
    const token = req.cookies.get("nt_session")?.value || "";
    const payload = token ? verifySessionToken(token) : null;
    const body = (await req.json().catch(() => null)) as
      | {
          buyerName?: string;
          buyerPhone?: string;
          amount?: number;
          note?: string;
        }
      | null;

    const result = await submitMarketplaceOffer({
      handle,
      buyerName: body?.buyerName ?? "",
      buyerPhone: body?.buyerPhone ?? "",
      amount: Number(body?.amount ?? 0),
      note: body?.note,
      buyerUserId: payload?.uid,
    });

    status = 201;
    const res = NextResponse.json(
      { ok: true, ...result },
      { status, headers: { "Cache-Control": "no-store" } }
    );
    await logApiUsage({
      endpoint: "/api/marketplace/listings/[handle]/offers",
      method: "POST",
      status,
      latencyMs: Date.now() - started,
      clientKey,
      handle,
    });
    return res;
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    status =
      message === "missing_handle" ||
      message === "missing_buyer_name" ||
      message === "invalid_buyer_phone" ||
      message === "invalid_offer_amount" ||
      message === "offer_below_minimum"
        ? 400
        : message === "seller_cannot_buy_own_handle"
          ? 409
          : message === "listing_not_found"
            ? 404
            : 500;
    const res = NextResponse.json(
      { error: message },
      { status, headers: { "Cache-Control": "no-store" } }
    );
    await logApiUsage({
      endpoint: "/api/marketplace/listings/[handle]/offers",
      method: "POST",
      status,
      latencyMs: Date.now() - started,
      clientKey,
    });
    return res;
  }
}
