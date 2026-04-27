import Link from "next/link";

import type { PaylinkReceiptView as PaylinkReceiptData } from "@/lib/paylinks";
import { AppPageHeader } from "./AppPageHeader";
import { PaylinkReceiptFlashToast } from "./PaylinkReceiptFlashToast";
import { Badge, Container } from "./ui";

const NAIRA = "\u20A6";

function formatCurrencyFromKobo(kobo: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Math.round(kobo / 100));
}

function maskEmail(value: string) {
  const [local, domain] = value.split("@");
  if (!local || !domain) return value;
  const visible = local.length <= 2 ? local[0] || "*" : local.slice(0, 2);
  return `${visible}${"*".repeat(Math.max(2, local.length - visible.length))}@${domain}`;
}

function statusTone(status: string) {
  if (status === "paid" || status === "successful") return "verify";
  if (
    status === "processing" ||
    status === "pending" ||
    status === "queued" ||
    status === "refunded"
  ) {
    return "neutral";
  }
  return "orange";
}

function titleForStatus(status: string) {
  if (status === "paid") return "Payment completed";
  if (status === "refunded") return "Refund recorded";
  if (status === "failed" || status === "cancelled") return "Payment not completed";
  return "Payment status";
}

export function PaylinkReceiptView({
  receipt,
  ownerView = false,
}: {
  receipt: PaylinkReceiptData;
  ownerView?: boolean;
}) {
  const payment = receipt.payment;
  const settlement = receipt.settlement;
  const payerEmail = ownerView ? payment.payerEmail : maskEmail(payment.payerEmail);
  const payerLabel = payment.payerName || payerEmail;

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      <PaylinkReceiptFlashToast />
      <AppPageHeader ctaHref={`/pay/${receipt.paylink.shortCode}`} ctaLabel="Open PayLink" />

      <main className="py-8 sm:py-10">
        <Container className="max-w-4xl">
          <div className="rounded-[2rem] border border-zinc-200/75 bg-white p-6 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-950/55">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={statusTone(payment.status)}>{titleForStatus(payment.status)}</Badge>
              <Badge tone="neutral">{payment.receiptNumber}</Badge>
              {payment.refundStatus ? (
                <Badge tone="neutral">Refund {payment.refundStatus}</Badge>
              ) : null}
              {settlement ? (
                <Badge tone={statusTone(settlement.status)}>
                  Settlement {settlement.status}
                </Badge>
              ) : null}
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
              <div>
                <div className="text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                  {formatCurrencyFromKobo(payment.amountKobo)}
                </div>
                <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                  Paid to {NAIRA}{receipt.paylink.handle} via Flutterwave-hosted checkout.
                </div>

                <div className="mt-6 grid gap-3 rounded-[1.5rem] border border-zinc-200/75 bg-zinc-50 p-4 dark:border-zinc-800/80 dark:bg-zinc-900/35">
                  <div className="grid grid-cols-[8rem_minmax(0,1fr)] gap-3 text-sm">
                    <div className="font-semibold text-zinc-500 dark:text-zinc-400">Recipient</div>
                    <div className="font-semibold text-zinc-950 dark:text-zinc-50">
                      {receipt.paylink.recipientName}
                    </div>
                  </div>
                  <div className="grid grid-cols-[8rem_minmax(0,1fr)] gap-3 text-sm">
                    <div className="font-semibold text-zinc-500 dark:text-zinc-400">Handle</div>
                    <div className="font-semibold text-zinc-950 dark:text-zinc-50">
                      {NAIRA}{receipt.paylink.handle}
                    </div>
                  </div>
                  <div className="grid grid-cols-[8rem_minmax(0,1fr)] gap-3 text-sm">
                    <div className="font-semibold text-zinc-500 dark:text-zinc-400">Payer</div>
                    <div className="font-semibold text-zinc-950 dark:text-zinc-50">
                      {payerLabel}
                    </div>
                  </div>
                  <div className="grid grid-cols-[8rem_minmax(0,1fr)] gap-3 text-sm">
                    <div className="font-semibold text-zinc-500 dark:text-zinc-400">Email</div>
                    <div className="font-semibold text-zinc-950 dark:text-zinc-50">
                      {payerEmail}
                    </div>
                  </div>
                  <div className="grid grid-cols-[8rem_minmax(0,1fr)] gap-3 text-sm">
                    <div className="font-semibold text-zinc-500 dark:text-zinc-400">Reference</div>
                    <div className="break-all font-mono text-[13px] font-semibold text-zinc-950 dark:text-zinc-50">
                      {payment.txRef}
                    </div>
                  </div>
                  {payment.note ? (
                    <div className="grid grid-cols-[8rem_minmax(0,1fr)] gap-3 text-sm">
                      <div className="font-semibold text-zinc-500 dark:text-zinc-400">Note</div>
                      <div className="font-semibold text-zinc-950 dark:text-zinc-50">
                        {payment.note}
                      </div>
                    </div>
                  ) : null}
                  {payment.refundStatus ? (
                    <div className="grid grid-cols-[8rem_minmax(0,1fr)] gap-3 text-sm">
                      <div className="font-semibold text-zinc-500 dark:text-zinc-400">Refund</div>
                      <div className="font-semibold text-zinc-950 dark:text-zinc-50">
                        {payment.refundAmountKobo
                          ? `${formatCurrencyFromKobo(payment.refundAmountKobo)} - `
                          : ""}
                        {payment.refundStatus}
                        {payment.refundReason ? ` - ${payment.refundReason}` : ""}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              <aside className="rounded-[1.7rem] border border-zinc-200/75 bg-zinc-50 p-4 dark:border-zinc-800/80 dark:bg-zinc-900/35">
                <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                  Payment lifecycle
                </div>
                <div className="mt-4 space-y-3 text-sm text-zinc-600 dark:text-zinc-300">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
                      Checkout status
                    </div>
                    <div className="mt-1 font-semibold text-zinc-950 dark:text-zinc-50">
                      {payment.status}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
                      Paid at
                    </div>
                    <div className="mt-1 font-semibold text-zinc-950 dark:text-zinc-50">
                      {payment.paidAt
                        ? new Date(payment.paidAt).toLocaleString("en-NG")
                        : "Awaiting confirmation"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
                      Settlement
                    </div>
                    <div className="mt-1 font-semibold text-zinc-950 dark:text-zinc-50">
                      {settlement ? settlement.status : "Not started"}
                    </div>
                  </div>
                  {settlement ? (
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
                        Net to recipient
                      </div>
                      <div className="mt-1 font-semibold text-zinc-950 dark:text-zinc-50">
                        {formatCurrencyFromKobo(settlement.amountKobo)}
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="mt-6 grid gap-3">
                  <Link
                    href={`/pay/${receipt.paylink.shortCode}`}
                    className="inline-flex h-11 items-center justify-center rounded-xl bg-nt-orange px-4 text-sm font-semibold text-white transition hover:brightness-110"
                  >
                    Pay again
                  </Link>
                  <Link
                    href="/paylink"
                    className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-200/80 bg-white/80 px-4 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-50 dark:border-zinc-800/80 dark:bg-zinc-950/30 dark:text-zinc-50 dark:hover:bg-zinc-900/70"
                  >
                    Back to PayLinks
                  </Link>
                </div>
              </aside>
            </div>
          </div>
        </Container>
      </main>
    </div>
  );
}
