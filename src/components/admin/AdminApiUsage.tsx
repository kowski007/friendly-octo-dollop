"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import type { ApiLogRecord } from "@/lib/adminTypes";
import { Badge, Card, cn } from "@/components/nairatag/ui";

type Paged<T> = { total: number; items: T[] };

function StatusPill({ status }: { status: number }) {
  const tone =
    status >= 200 && status < 400
      ? "verify"
      : status >= 400 && status < 500
        ? "orange"
        : "neutral";
  return (
    <Badge tone={tone} className="px-2 py-0.5 text-[11px] font-semibold">
      {status}
    </Badge>
  );
}

export function AdminApiUsage() {
  const [page, setPage] = useState(0);
  const [data, setData] = useState<Paged<ApiLogRecord> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const limit = 50;
  const offset = page * limit;

  const totalPages = useMemo(() => {
    const total = data?.total ?? 0;
    return Math.max(1, Math.ceil(total / limit));
  }, [data]);

  const fetchLogs = () => {
    startTransition(async () => {
      try {
        setError(null);
        const params = new URLSearchParams();
        params.set("limit", String(limit));
        params.set("offset", String(offset));

        const res = await fetch(`/api/admin/logs?${params.toString()}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Failed to load logs");
        const json = (await res.json()) as Paged<ApiLogRecord>;
        setData(json);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unknown error");
      }
    });
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
              API logs
            </div>
            <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
              {data ? `${data.total.toLocaleString()} total` : "—"}
              {isPending ? " (loading…)" : ""}
            </div>
          </div>

          <button
            type="button"
            onClick={fetchLogs}
            className="rounded-full border border-zinc-200/70 bg-white/70 px-4 py-2 text-sm font-semibold text-zinc-900 shadow-sm backdrop-blur transition hover:bg-white dark:border-zinc-800/70 dark:bg-zinc-950/30 dark:text-zinc-50 dark:hover:bg-zinc-950/45"
          >
            Refresh
          </button>
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
                <th className="py-2 pr-4">Time</th>
                <th className="py-2 pr-4">Method</th>
                <th className="py-2 pr-4">Endpoint</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Latency</th>
                <th className="py-2 pr-4">Handle</th>
                <th className="py-2 pr-4">Client</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60">
              {(data?.items ?? []).length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-4 text-sm text-zinc-600 dark:text-zinc-300"
                  >
                    No logs yet.
                  </td>
                </tr>
              ) : (
                (data?.items ?? []).map((l) => (
                  <tr key={l.id} className="text-zinc-900 dark:text-zinc-50">
                    <td className="py-3 pr-4 text-xs text-zinc-500 dark:text-zinc-400">
                      {new Date(l.ts).toLocaleString()}
                    </td>
                    <td className="py-3 pr-4 font-mono text-xs">{l.method}</td>
                    <td className="py-3 pr-4 font-mono text-xs">{l.endpoint}</td>
                    <td className="py-3 pr-4">
                      <StatusPill status={l.status} />
                    </td>
                    <td className="py-3 pr-4 text-xs">
                      {Math.round(l.latencyMs)}ms
                    </td>
                    <td className="py-3 pr-4 font-mono text-xs">
                      {l.handle ? `₦${l.handle}` : "—"}
                    </td>
                    <td
                      className={cn(
                        "py-3 pr-4 font-mono text-xs text-zinc-500 dark:text-zinc-400",
                        l.clientKey && "text-zinc-700 dark:text-zinc-200"
                      )}
                      title={l.clientKey ?? ""}
                    >
                      {l.clientKey ? l.clientKey.slice(0, 10) + "…" : "—"}
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

