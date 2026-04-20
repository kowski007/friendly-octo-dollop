import { NextResponse, type NextRequest } from "next/server";

import type { TransactionChannel, TransactionStatus } from "@/lib/adminTypes";
import {
  getHandleReputation,
  listTransactions,
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

export async function GET(req: NextRequest) {
  const started = Date.now();
  const clientKey = req.headers.get("x-nt-api-key") ?? undefined;
  const handle = req.nextUrl.searchParams.get("handle")?.trim() || undefined;
  const limit = Number(req.nextUrl.searchParams.get("limit") ?? "25");
  const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 100) : 25;

  const data = await listTransactions({ limit: safeLimit, handle });
  const res = NextResponse.json(data, {
    headers: { "Cache-Control": "no-store" },
  });

  await logApiUsage({
    endpoint: "/api/transactions",
    method: "GET",
    status: 200,
    latencyMs: Date.now() - started,
    clientKey,
    handle,
  });

  return res;
}

export async function POST(req: NextRequest) {
  const started = Date.now();
  const clientKey = req.headers.get("x-nt-api-key") ?? undefined;
  let status = 200;

  try {
    const body = (await req.json().catch(() => null)) as
      | {
          handle?: string;
          amount?: number;
          status?: string;
          channel?: string;
          counterpartyHandle?: string;
          reference?: string;
          note?: string;
          senderName?: string;
          senderPhone?: string;
        }
      | null;

    const transactionStatus = TRANSACTION_STATUSES.has(
      (body?.status ?? "pending") as TransactionStatus
    )
      ? ((body?.status ?? "pending") as TransactionStatus)
      : null;
    const channel = TRANSACTION_CHANNELS.has(
      (body?.channel ?? "payment_link") as TransactionChannel
    )
      ? ((body?.channel ?? "payment_link") as TransactionChannel)
      : null;

    if (!transactionStatus) throw new Error("invalid_transaction_status");
    if (!channel) throw new Error("invalid_transaction_channel");

    const transaction = await recordTransaction({
      handle: body?.handle ?? "",
      amount: Number(body?.amount ?? 0),
      status: transactionStatus,
      channel,
      counterpartyHandle: body?.counterpartyHandle,
      reference: body?.reference,
      note: body?.note,
      senderName: body?.senderName,
      senderPhone: body?.senderPhone,
      metadata: {
        sourcePage: req.headers.get("origin") ?? undefined,
        ip: req.headers.get("x-forwarded-for") ?? undefined,
      },
    });
    const reputation = await getHandleReputation(transaction.handle);

    status = 201;
    const res = NextResponse.json(
      { ok: true, transaction, reputation },
      { status, headers: { "Cache-Control": "no-store" } }
    );

    await logApiUsage({
      endpoint: "/api/transactions",
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
      message === "missing_handle" ||
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
      endpoint: "/api/transactions",
      method: "POST",
      status,
      latencyMs: Date.now() - started,
      clientKey,
    });

    return res;
  }
}
