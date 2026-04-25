import { NextResponse, type NextRequest } from "next/server";

import { logApiUsage } from "@/lib/adminStore";
import { markPaylinkCancelledByTxRef, reconcileFlutterwaveCharge } from "@/lib/paylinks";

function publicBaseUrl(req: NextRequest) {
  return (
    process.env.NT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    req.nextUrl.origin
  ).replace(/\/+$/, "");
}

function redirectToReceipt(req: NextRequest, paymentId: string, extra?: Record<string, string>) {
  const url = new URL(`/payments/receipts/${encodeURIComponent(paymentId)}`, publicBaseUrl(req));
  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      url.searchParams.set(key, value);
    }
  }
  return NextResponse.redirect(url, { status: 302 });
}

export async function GET(req: NextRequest) {
  const started = Date.now();
  const clientKey = req.headers.get("x-nt-api-key") ?? undefined;
  let status = 200;

  try {
    const paymentId = req.nextUrl.searchParams.get("payment_id")?.trim() || "";
    const transactionId = req.nextUrl.searchParams.get("transaction_id")?.trim() || "";
    const txRef = req.nextUrl.searchParams.get("tx_ref")?.trim() || "";
    const providerStatus =
      req.nextUrl.searchParams.get("status")?.trim().toLowerCase() || "unknown";

    if (!paymentId) {
      status = 400;
      return NextResponse.json(
        { error: "missing_payment_id" },
        { status, headers: { "Cache-Control": "no-store" } }
      );
    }

    if (transactionId) {
      const result = await reconcileFlutterwaveCharge({
        transactionId,
        txRef: txRef || undefined,
        source: "callback",
        appBaseUrl: publicBaseUrl(req),
      });

      status = 302;
      return redirectToReceipt(req, result?.payment.id || paymentId, {
        status: result?.payment.status || providerStatus,
      });
    }

    if (txRef) {
      await markPaylinkCancelledByTxRef(txRef, providerStatus || "cancelled");
    }

    status = 302;
    return redirectToReceipt(req, paymentId, {
      status: providerStatus || "cancelled",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    status = 500;
    return NextResponse.json(
      { error: message },
      { status, headers: { "Cache-Control": "no-store" } }
    );
  } finally {
    await logApiUsage({
      endpoint: "/api/paylinks/flutterwave/callback",
      method: "GET",
      status,
      latencyMs: Date.now() - started,
      clientKey,
    }).catch(() => null);
  }
}
