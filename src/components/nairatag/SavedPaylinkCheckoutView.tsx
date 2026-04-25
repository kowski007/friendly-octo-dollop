"use client";

import { useMemo, useState, useTransition } from "react";

import type { PaylinkPublicView } from "@/lib/paylinks";
import { AppPageHeader } from "./AppPageHeader";
import { useToast } from "./ToastProvider";
import { Badge, Container } from "./ui";

const NAIRA = "\u20A6";

function formatCurrency(amount?: number | null) {
  if (!amount) return "Flexible";
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function SavedPaylinkCheckoutView({
  paylink,
}: {
  paylink: PaylinkPublicView;
}) {
  const { toast } = useToast();
  const [amount, setAmount] = useState(paylink.amount ? String(paylink.amount) : "");
  const [payerName, setPayerName] = useState("");
  const [payerEmail, setPayerEmail] = useState("");
  const [payerPhone, setPayerPhone] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const canPay = paylink.status === "active" && !paylink.isExpired && !paylink.isExhausted;
  const resolvedAmount =
    amount && Number.isFinite(Number(amount)) && Number(amount) > 0
      ? Math.round(Number(amount))
      : undefined;

  const amountHint = useMemo(() => {
    if (paylink.amountType === "fixed") return formatCurrency(paylink.amount);
    if (paylink.amountType === "range") {
      return `${formatCurrency(paylink.amountMin)} - ${formatCurrency(paylink.amountMax)}`;
    }
    if (paylink.amountType === "suggested" && paylink.suggestedAmounts?.length) {
      return "Suggested amounts below";
    }
    return "Enter any amount";
  }, [paylink]);

  function showToastError(title: string, description: string, tone: "warning" | "error") {
    setError(description);
    toast({
      title,
      description,
      tone,
    });
  }

  function beginCheckout() {
    setError("");

    if (!canPay) {
      showToastError(
        "PayLink unavailable",
        "This PayLink is not accepting new payments right now.",
        "warning"
      );
      return;
    }

    if (!payerEmail.trim()) {
      showToastError(
        "Email required",
        "Enter an email so Flutterwave can complete checkout.",
        "warning"
      );
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch("/api/paylinks/checkout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-store",
          },
          body: JSON.stringify({
            shortCode: paylink.shortCode,
            amount: resolvedAmount,
            payerName: payerName.trim() || undefined,
            payerEmail: payerEmail.trim(),
            payerPhone: payerPhone.trim() || undefined,
            note: note.trim() || undefined,
          }),
        });

        const body = (await response.json().catch(() => null)) as
          | { error?: string; checkoutUrl?: string }
          | null;
        if (!response.ok || !body?.checkoutUrl) {
          throw new Error(body?.error || "checkout_start_failed");
        }

        toast({
          title: "Redirecting to Flutterwave",
          description: `You're heading to secure checkout for ${paylink.title || `${NAIRA}${paylink.handle}`}.`,
          tone: "info",
          durationMs: 1600,
        });

        window.setTimeout(() => {
          window.location.href = body.checkoutUrl as string;
        }, 120);
      } catch (err) {
        showToastError(
          "Checkout failed",
          err instanceof Error ? err.message.replace(/_/g, " ") : "Unable to start checkout.",
          "error"
        );
      }
    });
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      <AppPageHeader ctaHref="/" ctaLabel="Back home" />

      <main className="py-8 sm:py-10">
        <Container className="max-w-5xl">
          <div className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
            <section className="rounded-[2rem] border border-zinc-200/75 bg-white p-6 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-950/55">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={canPay ? "verify" : "orange"}>
                  {canPay ? "Live PayLink" : "Unavailable"}
                </Badge>
                <Badge tone="neutral">Flutterwave checkout</Badge>
              </div>

              <div className="mt-6 flex items-start gap-4">
                <div className="grid h-16 w-16 shrink-0 place-items-center rounded-[1.35rem] bg-nt-orange text-3xl font-bold text-white shadow-lg shadow-nt-orange/20">
                  {NAIRA}
                </div>
                <div className="min-w-0">
                  <div className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                    {paylink.title || `${NAIRA}${paylink.handle}`}
                  </div>
                  <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                    {paylink.description || `Pay ${paylink.recipient.displayName} securely.`}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge tone="neutral">
                      {NAIRA}
                      {paylink.handle}
                    </Badge>
                    <Badge tone="verify">{paylink.recipient.bank}</Badge>
                  </div>
                </div>
              </div>

              <div className="mt-8 space-y-4 rounded-[1.7rem] border border-zinc-200/75 bg-zinc-50 p-5 dark:border-zinc-800/80 dark:bg-zinc-900/35">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
                    Recipient
                  </div>
                  <div className="mt-1 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
                    {paylink.recipient.displayName}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
                    Amount
                  </div>
                  <div className="mt-1 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                    {paylink.amountType === "fixed"
                      ? formatCurrency(paylink.amount)
                      : resolvedAmount
                        ? formatCurrency(resolvedAmount)
                        : amountHint}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
                    Settlement rail
                  </div>
                  <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                    Flutterwave collects the payment, NairaTag verifies it server-side, then settlement is tracked to the recipient.
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[2rem] border border-zinc-200/75 bg-white p-6 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-950/55">
              <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                Checkout details
              </div>
              <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                Complete the details below, then we will send you into the Flutterwave hosted checkout.
              </div>

              <div className="mt-6 grid gap-4">
                {paylink.amountType !== "fixed" ? (
                  <label className="block">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
                      Amount
                    </div>
                    <input
                      value={amount}
                      onChange={(event) => setAmount(event.target.value.replace(/[^\d]/g, ""))}
                      inputMode="numeric"
                      placeholder={paylink.amountMin ? String(paylink.amountMin) : "5000"}
                      className="mt-2 h-12 w-full rounded-xl border border-zinc-200/80 bg-white/85 px-4 text-sm font-semibold text-zinc-950 outline-none placeholder:text-zinc-400 dark:border-zinc-800/80 dark:bg-zinc-950/40 dark:text-zinc-50"
                    />
                    <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                      {amountHint}
                    </div>
                    {paylink.amountType === "suggested" && paylink.suggestedAmounts?.length ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {paylink.suggestedAmounts.map((value) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setAmount(String(value))}
                            className="rounded-full border border-zinc-200/80 bg-zinc-50 px-3 py-1.5 text-xs font-semibold text-zinc-900 transition hover:bg-zinc-100 dark:border-zinc-800/80 dark:bg-zinc-900/40 dark:text-zinc-50 dark:hover:bg-zinc-900"
                          >
                            {formatCurrency(value)}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </label>
                ) : null}

                {paylink.collectName ? (
                  <label className="block">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
                      Your name
                    </div>
                    <input
                      value={payerName}
                      onChange={(event) => setPayerName(event.target.value)}
                      placeholder="Your full name"
                      className="mt-2 h-12 w-full rounded-xl border border-zinc-200/80 bg-white/85 px-4 text-sm font-semibold text-zinc-950 outline-none placeholder:text-zinc-400 dark:border-zinc-800/80 dark:bg-zinc-950/40 dark:text-zinc-50"
                    />
                  </label>
                ) : null}

                <label className="block">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
                    Email for receipt
                  </div>
                  <input
                    value={payerEmail}
                    onChange={(event) => setPayerEmail(event.target.value)}
                    inputMode="email"
                    placeholder="you@example.com"
                    className="mt-2 h-12 w-full rounded-xl border border-zinc-200/80 bg-white/85 px-4 text-sm font-semibold text-zinc-950 outline-none placeholder:text-zinc-400 dark:border-zinc-800/80 dark:bg-zinc-950/40 dark:text-zinc-50"
                  />
                </label>

                {paylink.collectPhone ? (
                  <label className="block">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
                      Phone
                    </div>
                    <input
                      value={payerPhone}
                      onChange={(event) => setPayerPhone(event.target.value)}
                      inputMode="tel"
                      placeholder="08012345678"
                      className="mt-2 h-12 w-full rounded-xl border border-zinc-200/80 bg-white/85 px-4 text-sm font-semibold text-zinc-950 outline-none placeholder:text-zinc-400 dark:border-zinc-800/80 dark:bg-zinc-950/40 dark:text-zinc-50"
                    />
                  </label>
                ) : null}

                <label className="block">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
                    Note
                  </div>
                  <textarea
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    rows={4}
                    placeholder="Optional note for this payment"
                    className="mt-2 w-full rounded-xl border border-zinc-200/80 bg-white/85 px-4 py-3 text-sm text-zinc-950 outline-none placeholder:text-zinc-400 dark:border-zinc-800/80 dark:bg-zinc-950/40 dark:text-zinc-50"
                  />
                </label>
              </div>

              {error ? (
                <div className="mt-4 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-900 dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-100">
                  {error}
                </div>
              ) : null}

              <button
                type="button"
                onClick={beginCheckout}
                disabled={!canPay || isPending}
                className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-xl bg-nt-orange px-4 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending ? "Redirecting to Flutterwave..." : "Continue to checkout"}
              </button>
            </section>
          </div>
        </Container>
      </main>
    </div>
  );
}
