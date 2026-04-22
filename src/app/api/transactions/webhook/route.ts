import crypto from "crypto";

import { NextResponse, type NextRequest } from "next/server";

import type { TransactionChannel, TransactionStatus } from "@/lib/adminTypes";
import {
  getHandleReputation,
  logApiUsage,
  recordTransaction,
} from "@/lib/adminStore";

const TRANSACTION_STATUSES = new Set<TransactionStatus>([
  "pending",
  "settled",
  "failed",
  "disputed",
]);
const TRANSACTION_CHANNELS = new Set<TransactionChannel>([
  "payment_link",
  "manual_transfer",
  "api",
  "marketplace",
]);

function webhookSecret() {
  return process.env.NT_TRANSACTION_WEBHOOK_SECRET?.trim() || "";
}

function signBody(body: string, secret: string) {
  return `sha256=${crypto.createHmac("sha256", secret).update(body).digest("hex")}`;
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function verifySignature(req: NextRequest, body: string) {
  const secret = webhookSecret();
  if (!secret) return process.env.NODE_ENV !== "production";

  const signature =
    req.headers.get("x-nairatag-signature") ||
    req.headers.get("x-signature") ||
    "";
  if (!signature) return false;

  return safeEqual(signature, signBody(body, secret));
}

export async function POST(req: NextRequest) {
  const started = Date.now();
  const clientKey = req.headers.get("x-nt-api-key") ?? undefined;
  let status = 200;

  try {
    const rawBody = await req.text();
    if (!verifySignature(req, rawBody)) {
      status = 401;
      throw new Error("invalid_webhook_signature");
    }

    const body = JSON.parse(rawBody) as {
      handle?: string;
      amount?: number;
      status?: string;
      channel?: string;
      reference?: string;
      eventId?: string;
      provider?: string;
      externalStatus?: string;
      note?: string;
      senderName?: string;
      senderPhone?: string;
      counterpartyHandle?: string;
    };
    const transactionStatus = TRANSACTION_STATUSES.has(
      (body.status ?? "pending") as TransactionStatus
    )
      ? ((body.status ?? "pending") as TransactionStatus)
      : null;
    const channel = TRANSACTION_CHANNELS.has(
      (body.channel ?? "api") as TransactionChannel
    )
      ? ((body.channel ?? "api") as TransactionChannel)
      : null;

    if (!transactionStatus) throw new Error("invalid_transaction_status");
    if (!channel) throw new Error("invalid_transaction_channel");

    const transaction = await recordTransaction({
      handle: body.handle ?? "",
      amount: Number(body.amount ?? 0),
      status: transactionStatus,
      channel,
      counterpartyHandle: body.counterpartyHandle,
      reference: body.reference || body.eventId,
      note: body.note,
      senderName: body.senderName,
      senderPhone: body.senderPhone,
      metadata: {
        sourcePage: "transaction_webhook",
        ip: req.headers.get("x-forwarded-for") ?? undefined,
        provider: body.provider,
        eventId: body.eventId,
        externalStatus: body.externalStatus,
      },
    });
    const reputation = await getHandleReputation(transaction.handle);

    status = 202;
    const res = NextResponse.json(
      { ok: true, transaction, reputation },
      { status, headers: { "Cache-Control": "no-store" } }
    );

    await logApiUsage({
      endpoint: "/api/transactions/webhook",
      method: "POST",
      status,
      latencyMs: Date.now() - started,
      clientKey,
      handle: transaction.handle,
    });

    return res;
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    status =
      status === 401
        ? 401
        : message === "missing_handle" ||
            message === "invalid_handle" ||
            message === "invalid_amount" ||
            message === "invalid_transaction_status" ||
            message === "invalid_transaction_channel"
          ? 400
          : message === "handle_not_found"
            ? 404
            : 500;

    const res = NextResponse.json(
      { error: message },
      { status, headers: { "Cache-Control": "no-store" } }
    );

    await logApiUsage({
      endpoint: "/api/transactions/webhook",
      method: "POST",
      status,
      latencyMs: Date.now() - started,
      clientKey,
    });

    return res;
  }
}
