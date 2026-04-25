import { NextResponse, type NextRequest } from "next/server";

import { logApiUsage } from "@/lib/adminStore";
import { getPaylinkByShortCode, startPaylinkCheckout } from "@/lib/paylinks";

function publicBaseUrl(req: NextRequest) {
  return (
    process.env.NT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    req.nextUrl.origin
  ).replace(/\/+$/, "");
}

export async function POST(req: NextRequest) {
  const started = Date.now();
  const clientKey = req.headers.get("x-nt-api-key") ?? undefined;
  let status = 200;

  try {
    const body = (await req.json().catch(() => null)) as
      | {
          shortCode?: string;
          amount?: number;
          payerName?: string;
          payerEmail?: string;
          payerPhone?: string;
          note?: string;
          customFields?: Record<string, unknown>;
        }
      | null;

    const shortCode = body?.shortCode?.trim().replace(/^\/+/, "") || "";
    const payerEmail = body?.payerEmail?.trim().toLowerCase() || "";

    if (!shortCode) {
      status = 400;
      return NextResponse.json(
        { error: "missing_short_code" },
        { status, headers: { "Cache-Control": "no-store" } }
      );
    }
    if (!payerEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payerEmail)) {
      status = 400;
      return NextResponse.json(
        { error: "invalid_payer_email" },
        { status, headers: { "Cache-Control": "no-store" } }
      );
    }

    const paylink = await getPaylinkByShortCode(shortCode);
    if (!paylink) {
      status = 404;
      return NextResponse.json(
        { error: "paylink_not_found" },
        { status, headers: { "Cache-Control": "no-store" } }
      );
    }

    const result = await startPaylinkCheckout({
      paylink,
      requestedAmountNaira:
        body?.amount && Number.isFinite(Number(body.amount))
          ? Math.round(Number(body.amount))
          : undefined,
      payerName: body?.payerName,
      payerEmail,
      payerPhone: body?.payerPhone,
      note: body?.note,
      customFields: body?.customFields,
      appBaseUrl: publicBaseUrl(req),
    });

    status = 201;
    return NextResponse.json(
      {
        ok: true,
        payment: result.payment,
        checkoutUrl: result.checkoutUrl,
      },
      { status, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    status =
      message === "paylink_inactive" ||
      message === "paylink_expired" ||
      message === "paylink_exhausted" ||
      message === "amount_required" ||
      message === "amount_out_of_range"
        ? 400
        : message === "paylink_not_found"
          ? 404
          : message === "flutterwave_not_configured"
            ? 503
            : 500;

    return NextResponse.json(
      { error: message },
      { status, headers: { "Cache-Control": "no-store" } }
    );
  } finally {
    await logApiUsage({
      endpoint: "/api/paylinks/checkout",
      method: "POST",
      status,
      latencyMs: Date.now() - started,
      clientKey,
    }).catch(() => null);
  }
}
