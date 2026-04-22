"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import { Badge, Card } from "@/components/nairatag/ui";

type ReferralItem = {
  id: string;
  referralCode: string;
  source: string;
  createdAt: string;
  convertedAt?: string;
  points: number;
  signupPoints: number;
  conversionPoints: number;
  referrerHandle: string | null;
  referredHandle: string | null;
  referrer: { id: string; phone: string; fullName?: string; referralCode?: string } | null;
  referred: { id: string; phone: string; fullName?: string } | null;
};

type Paged<T> = { total: number; items: T[] };

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function formatPoints(value: number) {
  return `${value.toLocaleString()} pts`;
}

export function AdminReferrals() {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [data, setData] = useState<Paged<ReferralItem> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const limit = 25;
  const offset = page * limit;

  const totalPages = useMemo(() => {
    const total = data?.total ?? 0;
    return Math.max(1, Math.ceil(total / limit));
  }, [data]);

  const fetchReferrals = () => {
    startTransition(async () => {
      try {
        setError(null);
        const params = new URLSearchParams();
        params.set("limit", String(limit));
        params.set("offset", String(offset));
        if (q.trim()) params.set("q", q.trim());

        const res = await fetch(`/api/admin/referrals?${params.toString()}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Failed to load referrals");
        const json = (await res.json()) as Paged<ReferralItem>;
        setData(json);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unknown error");
      }
    });
  };

  useEffect(() => {
    fetchReferrals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
              Referral events
            </div>
            <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
              {data ? `${data.total.toLocaleString()} total` : "—"}
              {isPending ? " (loading…)" : ""}
            </div>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search code, phone, handle…"
              className="w-full rounded-full border border-zinc-200/70 bg-white/70 px-4 py-2 text-sm font-medium text-zinc-950 shadow-sm backdrop-blur outline-none placeholder:text-zinc-400 focus-visible:ring-2 focus-visible:ring-orange-200 dark:border-zinc-800/70 dark:bg-zinc-950/25 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus-visible:ring-orange-900/50 sm:w-80"
            />
            <button
              type="button"
              onClick={() => {
                setPage(0);
                fetchReferrals();
              }}
              className="rounded-full border border-zinc-200/70 bg-white/70 px-4 py-2 text-sm font-semibold text-zinc-900 shadow-sm backdrop-blur transition hover:bg-white dark:border-zinc-800/70 dark:bg-zinc-950/30 dark:text-zinc-50 dark:hover:bg-zinc-950/45"
            >
              Search
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
                <th className="py-2 pr-4">Referrer</th>
                <th className="py-2 pr-4">Referred</th>
                <th className="py-2 pr-4">Code</th>
                <th className="py-2 pr-4">Points</th>
                <th className="py-2 pr-4">Signed up</th>
                <th className="py-2 pr-4">Converted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60">
              {(data?.items ?? []).length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-4 text-sm text-zinc-600 dark:text-zinc-300"
                  >
                    No referrals yet.
                  </td>
                </tr>
              ) : (
                (data?.items ?? []).map((item) => (
                  <tr key={item.id} className="text-zinc-900 dark:text-zinc-50">
                    <td className="py-3 pr-4">
                      <div className="font-medium">
                        {item.referrerHandle ? `₦${item.referrerHandle}` : "—"}
                      </div>
                      <div className="mt-0.5 font-mono text-xs text-zinc-500 dark:text-zinc-400">
                        {item.referrer?.phone ?? "—"}
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="font-medium">
                        {item.referredHandle ? `₦${item.referredHandle}` : "—"}
                      </div>
                      <div className="mt-0.5 font-mono text-xs text-zinc-500 dark:text-zinc-400">
                        {item.referred?.phone ?? "—"}
                      </div>
                    </td>
                    <td className="py-3 pr-4 font-mono text-xs">{item.referralCode}</td>
                    <td className="py-3 pr-4">
                      <Badge tone="orange" className="px-2 py-0.5 text-[11px]">
                        {formatPoints(item.points)}
                      </Badge>
                      <div className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                        {item.signupPoints}+{item.conversionPoints}
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-xs text-zinc-500 dark:text-zinc-400">
                      {formatDate(item.createdAt)}
                    </td>
                    <td className="py-3 pr-4">
                      {item.convertedAt ? (
                        <Badge tone="verify" className="px-2 py-0.5 text-[11px]">
                          {formatDate(item.convertedAt)}
                        </Badge>
                      ) : (
                        <Badge tone="neutral" className="px-2 py-0.5 text-[11px]">
                          pending
                        </Badge>
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
