"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  handle: string;
  saleMode: "fixed_price" | "offers_only";
  askAmount?: number;
  minOfferAmount?: number;
  disabled?: boolean;
};

function formatCurrency(amount?: number | null) {
  if (amount == null) return null;
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function MarketplaceOfferForm({
  handle,
  saleMode,
  askAmount,
  minOfferAmount,
  disabled,
}: Props) {
  const router = useRouter();
  const [buyerName, setBuyerName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [amount, setAmount] = useState(
    askAmount ? String(askAmount) : minOfferAmount ? String(minOfferAmount) : ""
  );
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submitOffer() {
    setBusy(true);
    setError(null);
    setFeedback(null);

    try {
      const response = await fetch(`/api/marketplace/listings/${handle}/offers`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          buyerName,
          buyerPhone,
          amount: Number(amount),
          note,
        }),
      });
      const data = (await response.json().catch(() => ({ error: "unknown_error" }))) as
        | { ok: true }
        | { error: string };

      if (!response.ok) {
        setError("error" in data ? data.error : "Could not submit offer.");
        return;
      }

      setFeedback(
        saleMode === "fixed_price"
          ? "Offer submitted. The seller now needs to move it into transfer review."
          : "Offer submitted. The seller can now review it."
      );
      setBuyerName("");
      setBuyerPhone("");
      setAmount(askAmount ? String(askAmount) : minOfferAmount ? String(minOfferAmount) : "");
      setNote("");
      router.refresh();
    } catch {
      setError("Could not submit offer.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-[2rem] border border-zinc-200/70 bg-white/70 p-5 dark:border-zinc-800/80 dark:bg-zinc-950/30">
      <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
        Submit a real offer
      </div>
      <div className="mt-2 text-sm leading-7 text-zinc-600 dark:text-zinc-300">
        {saleMode === "fixed_price"
          ? `Ask price is ${formatCurrency(askAmount)}. You can match it or send another amount and wait for seller review.`
          : "This listing is offer-only. Submit your amount and contact details to start transfer review."}
      </div>

      {feedback ? (
        <div className="mt-4 rounded-[1.3rem] border border-emerald-200/70 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200">
          {feedback}
        </div>
      ) : null}
      {error ? (
        <div className="mt-4 rounded-[1.3rem] border border-orange-200/70 bg-orange-50/80 px-4 py-3 text-sm text-orange-900 dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-100">
          {error}
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="space-y-2 text-sm">
          <span className="font-medium text-zinc-950 dark:text-zinc-50">Your name</span>
          <input
            value={buyerName}
            onChange={(event) => setBuyerName(event.target.value)}
            className="w-full rounded-2xl border border-zinc-200/70 bg-white/80 px-4 py-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-orange-200 dark:border-zinc-800/80 dark:bg-zinc-950/40 dark:focus-visible:ring-orange-900/60"
          />
        </label>
        <label className="space-y-2 text-sm">
          <span className="font-medium text-zinc-950 dark:text-zinc-50">Phone number</span>
          <input
            value={buyerPhone}
            onChange={(event) => setBuyerPhone(event.target.value)}
            placeholder="08012345678"
            className="w-full rounded-2xl border border-zinc-200/70 bg-white/80 px-4 py-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-orange-200 dark:border-zinc-800/80 dark:bg-zinc-950/40 dark:focus-visible:ring-orange-900/60"
          />
        </label>
        <label className="space-y-2 text-sm">
          <span className="font-medium text-zinc-950 dark:text-zinc-50">Offer amount</span>
          <input
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            type="number"
            min={minOfferAmount ?? 0}
            className="w-full rounded-2xl border border-zinc-200/70 bg-white/80 px-4 py-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-orange-200 dark:border-zinc-800/80 dark:bg-zinc-950/40 dark:focus-visible:ring-orange-900/60"
          />
        </label>
        <label className="space-y-2 text-sm sm:col-span-2">
          <span className="font-medium text-zinc-950 dark:text-zinc-50">Offer note</span>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
            placeholder="Share why you want the handle, your timeline, or any brand context."
            className="w-full rounded-[1.5rem] border border-zinc-200/70 bg-white/80 px-4 py-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-orange-200 dark:border-zinc-800/80 dark:bg-zinc-950/40 dark:focus-visible:ring-orange-900/60"
          />
        </label>
      </div>

      <button
        type="button"
        onClick={() => void submitOffer()}
        disabled={busy || disabled}
        className="mt-5 rounded-full bg-nt-orange px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? "Submitting..." : "Submit offer"}
      </button>
    </div>
  );
}
