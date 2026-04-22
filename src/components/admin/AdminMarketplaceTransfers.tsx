"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import type { MarketplaceTransferDetail, MarketplaceTransferStatus } from "@/lib/adminTypes";
import { Badge, Card, cn } from "@/components/nairatag/ui";

type Paged<T> = { total: number; items: T[] };

const STATUSES: Array<{ label: string; value: MarketplaceTransferStatus }> = [
  { label: "Pending review", value: "pending_review" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
];

function toneForStatus(status: MarketplaceTransferStatus) {
  if (status === "pending_review") return "orange" as const;
  if (status === "approved") return "verify" as const;
  return "neutral" as const;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatHandle(handle: string) {
  return `₦${handle}`;
}

export function AdminMarketplaceTransfers() {
  const [status, setStatus] = useState<MarketplaceTransferStatus>("pending_review");
  const [page, setPage] = useState(0);
  const [data, setData] = useState<Paged<MarketplaceTransferDetail> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();

  const limit = 25;
  const offset = page * limit;

  const totalPages = useMemo(() => {
    const total = data?.total ?? 0;
    return Math.max(1, Math.ceil(total / limit));
  }, [data]);

  const fetchTransfers = () => {
    startTransition(async () => {
      try {
        setError(null);
        const params = new URLSearchParams();
        params.set("limit", String(limit));
        params.set("offset", String(offset));
        params.set("status", status);

        const res = await fetch(`/api/admin/marketplace/transfers?${params.toString()}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Failed to load transfers");
        const json = (await res.json()) as Paged<MarketplaceTransferDetail>;
        setData(json);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unknown error");
      }
    });
  };

  useEffect(() => {
    fetchTransfers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status]);

  const reviewTransfer = (transferId: string, action: "approve" | "reject") => {
    startTransition(async () => {
      try {
        setError(null);
        const res = await fetch(`/api/admin/marketplace/transfers/${transferId}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            action,
            reviewNote: note.trim() || undefined,
          }),
        });

        const body = (await res.json().catch(() => null)) as
          | { ok: true }
          | { error: string }
          | null;

        if (!res.ok) {
          setError(body && "error" in body ? body.error : "Review failed");
          return;
        }

        setNote("");
        fetchTransfers();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Review failed");
      }
    });
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
              Transfers
            </div>
            <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
              {data ? `${data.total.toLocaleString()} total` : "—"}
              {isPending ? " (loading…)" : ""}
            </div>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <div className="flex flex-wrap gap-2">
              {STATUSES.map((entry) => (
                <button
                  key={entry.value}
                  type="button"
                  onClick={() => {
                    setPage(0);
                    setStatus(entry.value);
                  }}
                  className={cn(
                    "rounded-full border px-4 py-2 text-sm font-semibold shadow-sm transition",
                    status === entry.value
                      ? "border-zinc-950 bg-zinc-950 text-white dark:border-white dark:bg-white dark:text-zinc-950"
                      : "border-zinc-200/70 bg-white/70 text-zinc-900 hover:bg-white dark:border-zinc-800/70 dark:bg-zinc-950/30 dark:text-zinc-50 dark:hover:bg-zinc-950/45"
                  )}
                >
                  {entry.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-12">
          <div className="md:col-span-8">
            <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
              Review note (optional)
            </label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add context for the decision..."
              className="mt-2 w-full rounded-full border border-zinc-200/70 bg-white/70 px-4 py-2 text-sm font-medium text-zinc-950 shadow-sm backdrop-blur outline-none placeholder:text-zinc-400 focus-visible:ring-2 focus-visible:ring-orange-200 dark:border-zinc-800/70 dark:bg-zinc-950/25 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus-visible:ring-orange-900/50"
            />
          </div>

          <div className="md:col-span-4 md:flex md:items-end md:justify-end">
            <button
              type="button"
              onClick={fetchTransfers}
              className="w-full rounded-full border border-zinc-200/70 bg-white/70 px-4 py-2 text-sm font-semibold text-zinc-900 shadow-sm backdrop-blur transition hover:bg-white dark:border-zinc-800/70 dark:bg-zinc-950/30 dark:text-zinc-50 dark:hover:bg-zinc-950/45 md:w-auto"
            >
              Refresh
            </button>
          </div>
        </div>

        {error ? (
          <div className="mt-4 text-sm font-semibold text-rose-700 dark:text-rose-300">
            {error}
          </div>
        ) : null}

        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                <th className="py-2 pr-4">Handle</th>
                <th className="py-2 pr-4">Buyer</th>
                <th className="py-2 pr-4">Amount</th>
                <th className="py-2 pr-4">Payout</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Created</th>
                <th className="py-2 pr-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60">
              {(data?.items ?? []).length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-4 text-sm text-zinc-600 dark:text-zinc-300"
                  >
                    No transfers.
                  </td>
                </tr>
              ) : (
                (data?.items ?? []).map((transfer) => (
                  <tr key={transfer.id} className="text-zinc-900 dark:text-zinc-50">
                    <td className="py-3 pr-4 font-mono text-xs">
                      {formatHandle(transfer.handle)}
                    </td>
                    <td className="py-3 pr-4">
                      <div className="font-medium">{transfer.buyerName}</div>
                      <div className="mt-0.5 font-mono text-xs text-zinc-500 dark:text-zinc-400">
                        {transfer.buyerPhone}
                      </div>
                    </td>
                    <td className="py-3 pr-4 font-semibold">
                      {formatCurrency(transfer.amount)}
                    </td>
                    <td className="py-3 pr-4">
                      <Badge
                        tone={transfer.buyerBankAccount ? "verify" : "neutral"}
                        className="px-2 py-0.5 text-[11px]"
                      >
                        {transfer.buyerBankAccount
                          ? transfer.buyerBankAccount.bankName
                          : "not linked"}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4">
                      <Badge
                        tone={toneForStatus(transfer.status)}
                        className="px-2 py-0.5 text-[11px]"
                      >
                        {transfer.status.replace("_", " ")}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4 text-xs text-zinc-500 dark:text-zinc-400">
                      {new Date(transfer.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 pr-4 text-right">
                      {transfer.status === "pending_review" ? (
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => reviewTransfer(transfer.id, "reject")}
                            disabled={isPending}
                            className="rounded-full border border-zinc-200/70 bg-white/70 px-3 py-2 text-xs font-semibold text-zinc-900 shadow-sm backdrop-blur transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-800/70 dark:bg-zinc-950/30 dark:text-zinc-50 dark:hover:bg-zinc-950/45"
                          >
                            Reject
                          </button>
                          <button
                            type="button"
                            onClick={() => reviewTransfer(transfer.id, "approve")}
                            disabled={isPending}
                            className="rounded-full bg-nt-orange px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Approve
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                          —
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div className="text-sm text-zinc-600 dark:text-zinc-300">
            Page {page + 1} of {totalPages}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0 || isPending}
              className="rounded-full border border-zinc-200/70 bg-white/70 px-4 py-2 text-sm font-semibold text-zinc-900 shadow-sm backdrop-blur transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-800/70 dark:bg-zinc-950/30 dark:text-zinc-50 dark:hover:bg-zinc-950/45"
            >
              Prev
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1 || isPending}
              className="rounded-full border border-zinc-200/70 bg-white/70 px-4 py-2 text-sm font-semibold text-zinc-900 shadow-sm backdrop-blur transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-800/70 dark:bg-zinc-950/30 dark:text-zinc-50 dark:hover:bg-zinc-950/45"
            >
              Next
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
