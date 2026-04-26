import { NextResponse, type NextRequest } from "next/server";

import { logApiUsage } from "@/lib/adminStore";
import { markPaylinkCancelledByTxRef, reconcileFlutterwaveCharge } from "@/lib/paylinks";
import { createReceiptAccessToken } from "@/lib/paylinks/receiptAccess";

function publicBaseUrl(req: NextRequest) {
  return (
    process.env.NT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    req.nextUrl.origin
  ).replace(/\/+$/, "");
}

function buildReceiptUrl(req: NextRequest, paymentId: string) {
  const access = createReceiptAccessToken({ paymentId });
  const url = new URL(`/payments/receipts/${encodeURIComponent(paymentId)}`, publicBaseUrl(req));
  url.searchParams.set("access", access);
  return url;
}

function redirectToReceipt(req: NextRequest, paymentId: string, extra?: Record<string, string>) {
  const url = buildReceiptUrl(req, paymentId);
  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      url.searchParams.set(key, value);
    }
  }
  return NextResponse.redirect(url, { status: 302 });
}

function redirectToMerchantUrl(
  baseUrl: string,
  params: Record<string, string | undefined>
) {
  const url = new URL(baseUrl);
  for (const [key, value] of Object.entries(params)) {
    if (value) {
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

      const merchantTarget =
        result && result.payment.status === "paid"
          ? result.paylink.redirectUrl
          : result?.paylink.cancelUrl || result?.paylink.redirectUrl;

      if (merchantTarget && result) {
        const receiptUrl = buildReceiptUrl(req, result.payment.id).toString();
        status = 302;
        return redirectToMerchantUrl(merchantTarget, {
          payment_id: result.payment.id,
          status: result.payment.status,
          tx_ref: result.payment.txRef,
          handle: result.paylink.handle,
          short_code: result.paylink.shortCode,
          receipt_url: receiptUrl,
        });
      }

      status = 302;
      return redirectToReceipt(req, result?.payment.id || paymentId, {
        status: result?.payment.status || providerStatus,
      });
    }

    if (txRef) {
      const cancelled = await markPaylinkCancelledByTxRef(
        txRef,
        providerStatus || "cancelled"
      );

      if (cancelled?.paylink?.cancelUrl) {
        const receiptUrl = buildReceiptUrl(req, cancelled.payment.id).toString();
        status = 302;
        return redirectToMerchantUrl(cancelled.paylink.cancelUrl, {
          payment_id: cancelled.payment.id,
          status: cancelled.payment.status,
          tx_ref: cancelled.payment.txRef,
          handle: cancelled.paylink.handle,
          short_code: cancelled.paylink.shortCode,
          receipt_url: receiptUrl,
        });
      }

      if (cancelled?.payment?.id) {
        status = 302;
        return redirectToReceipt(req, cancelled.payment.id, {
          status: cancelled.payment.status,
        });
      }
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
