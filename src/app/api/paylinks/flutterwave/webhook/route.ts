import { NextResponse, type NextRequest } from "next/server";

import { logApiUsage } from "@/lib/adminStore";
import {
  reconcileFlutterwaveCharge,
  reconcileFlutterwaveTransferEvent,
  verifyWebhookHash,
} from "@/lib/paylinks";

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
    const signature = req.headers.get("verif-hash");
    if (!verifyWebhookHash(signature)) {
      status = 401;
      return NextResponse.json(
        { error: "invalid_webhook_signature" },
        { status, headers: { "Cache-Control": "no-store" } }
      );
    }

    const payload = (await req.json().catch(() => null)) as
      | {
          event?: string;
          data?: {
            id?: string | number;
            tx_ref?: string;
            flw_ref?: string;
            status?: string;
            reference?: string;
          };
        }
      | null;

    const eventType = payload?.event?.trim().toLowerCase() || "unknown";
    const data = payload?.data ?? {};

    if (eventType === "charge.completed" && data.id) {
      await reconcileFlutterwaveCharge({
        transactionId: String(data.id),
        txRef: data.tx_ref,
        source: "webhook",
        eventKey: `${eventType}:${data.id}:${data.tx_ref ?? ""}`,
        eventType,
        eventPayload: payload as Record<string, unknown>,
        appBaseUrl: publicBaseUrl(req),
      });
    }

    if (
      (eventType === "transfer.completed" ||
        eventType === "transfer.failed" ||
        eventType === "transfer.reversed") &&
      (data.id || data.reference)
    ) {
      await reconcileFlutterwaveTransferEvent({
        transferId: data.id ? String(data.id) : undefined,
        reference: data.reference || data.flw_ref,
        status: data.status?.trim().toLowerCase() || eventType,
        eventKey: `${eventType}:${data.id ?? data.reference ?? ""}`,
        eventType,
        payload: payload as Record<string, unknown>,
      });
    }

    status = 200;
    return NextResponse.json(
      { ok: true },
      { status, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    status = 500;
    return NextResponse.json(
      { error: message },
      { status, headers: { "Cache-Control": "no-store" } }
    );
  } finally {
    await logApiUsage({
      endpoint: "/api/paylinks/flutterwave/webhook",
      method: "POST",
      status,
      latencyMs: Date.now() - started,
      clientKey,
    }).catch(() => null);
  }
}
