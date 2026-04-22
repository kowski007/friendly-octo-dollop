"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { HandleReputation, TransactionRecord } from "@/lib/adminTypes";
import { Badge, Card, cn } from "./ui";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function PaymentSimulator({
  handle,
  defaultAmount,
  defaultNote,
  disabled = false,
}: {
  handle: string;
  defaultAmount: number | null;
  defaultNote?: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState(defaultAmount?.toString() ?? "5000");
  const [senderName, setSenderName] = useState("Pitch Sender");
  const [senderPhone, setSenderPhone] = useState("+2348012345678");
  const [note, setNote] = useState(defaultNote ?? "Pitch demo payment");
  const [status, setStatus] = useState<TransactionRecord["status"]>("settled");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transaction, setTransaction] = useState<TransactionRecord | null>(null);
  const [reputation, setReputation] = useState<HandleReputation | null>(null);

  async function submitPayment() {
    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          handle,
          amount: Number(amount),
          status,
          channel: "payment_link",
          senderName,
          senderPhone,
          note,
          reference: `pitch_${Date.now().toString(36)}`,
        }),
      });
      const data = (await response.json().catch(() => ({ error: "unknown_error" }))) as
        | {
            ok: true;
            transaction: TransactionRecord;
            reputation: HandleReputation | null;
          }
        | { error: string };

      if (!response.ok || !("ok" in data)) {
        setError("error" in data ? data.error : "Payment simulation failed.");
        return;
      }

      setTransaction(data.transaction);
      setReputation(data.reputation);
      router.refresh();
    } catch {
      setError("Payment simulation failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="orange">Pitch demo</Badge>
        <Badge tone="verify">Records transaction</Badge>
      </div>

      <div className="mt-4 text-sm font-semibold text-zinc-950 dark:text-zinc-50">
        Send money simulation
      </div>
      <div className="mt-2 text-sm leading-7 text-zinc-600 dark:text-zinc-300">
        Creates a real local transaction, then reputation and notifications update from the same data.
      </div>

      <div className="mt-5 grid gap-3">
        <label className="space-y-2 text-sm">
          <span className="font-medium text-zinc-950 dark:text-zinc-50">Amount</span>
          <input
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            type="number"
            min={1}
            disabled={busy || disabled}
            className="w-full rounded-2xl border border-zinc-200/70 bg-white/80 px-4 py-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-orange-200 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-800/80 dark:bg-zinc-950/40 dark:focus-visible:ring-orange-900/60"
          />
        </label>

        <label className="space-y-2 text-sm">
          <span className="font-medium text-zinc-950 dark:text-zinc-50">Sender</span>
          <input
            value={senderName}
            onChange={(event) => setSenderName(event.target.value)}
            disabled={busy || disabled}
            className="w-full rounded-2xl border border-zinc-200/70 bg-white/80 px-4 py-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-orange-200 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-800/80 dark:bg-zinc-950/40 dark:focus-visible:ring-orange-900/60"
          />
        </label>

        <label className="space-y-2 text-sm">
          <span className="font-medium text-zinc-950 dark:text-zinc-50">Phone</span>
          <input
            value={senderPhone}
            onChange={(event) => setSenderPhone(event.target.value)}
            disabled={busy || disabled}
            className="w-full rounded-2xl border border-zinc-200/70 bg-white/80 px-4 py-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-orange-200 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-800/80 dark:bg-zinc-950/40 dark:focus-visible:ring-orange-900/60"
          />
        </label>

        <label className="space-y-2 text-sm">
          <span className="font-medium text-zinc-950 dark:text-zinc-50">Status</span>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as TransactionRecord["status"])}
            disabled={busy || disabled}
            className="w-full rounded-2xl border border-zinc-200/70 bg-white/80 px-4 py-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-orange-200 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-800/80 dark:bg-zinc-950/40 dark:focus-visible:ring-orange-900/60"
          >
            <option value="settled">Settled</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="disputed">Disputed</option>
          </select>
        </label>

        <label className="space-y-2 text-sm">
          <span className="font-medium text-zinc-950 dark:text-zinc-50">Note</span>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
            disabled={busy || disabled}
            className="w-full rounded-[1.5rem] border border-zinc-200/70 bg-white/80 px-4 py-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-orange-200 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-800/80 dark:bg-zinc-950/40 dark:focus-visible:ring-orange-900/60"
          />
        </label>
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl border border-orange-200/70 bg-orange-50/80 px-4 py-3 text-sm text-orange-900 dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-100">
          {error}
        </div>
      ) : null}

      {transaction ? (
        <div className="mt-4 rounded-2xl border border-emerald-200/70 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-100">
          {formatCurrency(transaction.amount)} {transaction.status}. Trust is now{" "}
          {reputation?.trustScore ?? "recalculating"}/100.
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => void submitPayment()}
        disabled={busy || disabled}
        className={cn(
          "mt-5 w-full rounded-full bg-nt-orange px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        )}
      >
        {busy ? "Recording..." : "Confirm demo payment"}
      </button>
    </Card>
  );
}
