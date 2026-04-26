import { NextResponse, type NextRequest } from "next/server";

import { logApiUsage } from "@/lib/adminStore";
import { refundPaylinkPayment } from "@/lib/paylinks";
import { verifySessionToken } from "@/lib/session";

type RouteProps = {
  params: Promise<{ paymentId: string }>;
};

export async function POST(req: NextRequest, { params }: RouteProps) {
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

    const { paymentId } = await params;
    const body = (await req.json().catch(() => null)) as
      | { amount?: number; reason?: string }
      | null;

    const payment = await refundPaylinkPayment({
      paymentId,
      ownerId: payload.uid,
      amountNaira:
        body?.amount && Number.isFinite(Number(body.amount))
          ? Math.round(Number(body.amount))
          : undefined,
      reason: body?.reason,
    });

    status = 200;
    return NextResponse.json(
      { ok: true, payment },
      { status, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    status =
      message === "payment_not_found"
        ? 404
        : message === "invalid_refund_amount" || message === "refund_not_allowed"
          ? 400
          : message === "processor_transaction_missing"
            ? 409
            : message === "flutterwave_not_configured"
              ? 503
              : 500;

    return NextResponse.json(
      { error: message },
      { status, headers: { "Cache-Control": "no-store" } }
    );
  } finally {
    await logApiUsage({
      endpoint: "/api/paylinks/payments/[paymentId]/refund",
      method: "POST",
      status,
      latencyMs: Date.now() - started,
      clientKey,
    }).catch(() => null);
  }
}

