"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import type { UserRecord } from "@/lib/adminTypes";
import { Badge, Card, cn } from "@/components/nairatag/ui";

type Paged<T> = { total: number; items: T[] };

function bvnLabel(last4?: string) {
  if (!last4) return "—";
  return `••••${last4}`;
}

export function AdminUsers() {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [data, setData] = useState<Paged<UserRecord> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const limit = 25;
  const offset = page * limit;

  const totalPages = useMemo(() => {
    const total = data?.total ?? 0;
    return Math.max(1, Math.ceil(total / limit));
  }, [data]);

  const fetchUsers = () => {
    startTransition(async () => {
      try {
        setError(null);
        const params = new URLSearchParams();
        params.set("limit", String(limit));
        params.set("offset", String(offset));
        if (q.trim()) params.set("q", q.trim());

        const res = await fetch(`/api/admin/users?${params.toString()}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Failed to load users");
        const json = (await res.json()) as Paged<UserRecord>;
        setData(json);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unknown error");
      }
    });
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
              Users
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
              placeholder="Search phone, name, BVN last4…"
              className="w-full rounded-full border border-zinc-200/70 bg-white/70 px-4 py-2 text-sm font-medium text-zinc-950 shadow-sm backdrop-blur outline-none placeholder:text-zinc-400 focus-visible:ring-2 focus-visible:ring-orange-200 dark:border-zinc-800/70 dark:bg-zinc-950/25 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus-visible:ring-orange-900/50 sm:w-80"
            />
            <button
              type="button"
              onClick={() => {
                setPage(0);
                fetchUsers();
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
                <th className="py-2 pr-4">Phone</th>
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">BVN</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60">
              {(data?.items ?? []).length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="py-4 text-sm text-zinc-600 dark:text-zinc-300"
                  >
                    No users yet.
                  </td>
                </tr>
              ) : (
                (data?.items ?? []).map((u) => (
                  <tr key={u.id} className="text-zinc-900 dark:text-zinc-50">
                    <td className="py-3 pr-4 font-mono text-xs">{u.phone}</td>
                    <td className="py-3 pr-4">{u.fullName || "—"}</td>
                    <td className="py-3 pr-4 font-mono text-xs text-zinc-600 dark:text-zinc-300">
                      {bvnLabel(u.bvnLast4)}
                    </td>
                    <td className="py-3 pr-4">
                      <Badge
                        tone={u.bankLinkedAt || u.bvnLinkedAt ? "verify" : "neutral"}
                        className={cn("px-2 py-0.5 text-[11px]")}
                      >
                        {u.bankLinkedAt
                          ? "bank linked"
                          : u.bvnLinkedAt
                            ? "bvn linked"
                            : "phone verified"}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4 text-xs text-zinc-500 dark:text-zinc-400">
                      {new Date(u.createdAt).toLocaleString()}
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
