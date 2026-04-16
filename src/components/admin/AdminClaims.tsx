"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import type { ClaimRecord, Verification } from "@/lib/adminTypes";
import { Badge, Card, NairaTermBadge, cn } from "@/components/nairatag/ui";

type Paged<T> = { total: number; items: T[] };

function toneForVerification(v: Verification) {
  if (v === "pending") return "neutral" as const;
  return "verify" as const;
}

export function AdminClaims() {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [data, setData] = useState<Paged<ClaimRecord> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const limit = 25;
  const offset = page * limit;

  const totalPages = useMemo(() => {
    const total = data?.total ?? 0;
    return Math.max(1, Math.ceil(total / limit));
  }, [data]);

  const fetchClaims = () => {
    startTransition(async () => {
      try {
        setError(null);
        const params = new URLSearchParams();
        params.set("limit", String(limit));
        params.set("offset", String(offset));
        if (q.trim()) params.set("q", q.trim());

        const res = await fetch(`/api/admin/claims?${params.toString()}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Failed to load claims");
        const json = (await res.json()) as Paged<ClaimRecord>;
        setData(json);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unknown error");
      }
    });
  };

  useEffect(() => {
    fetchClaims();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const [form, setForm] = useState({
    handle: "",
    displayName: "",
    bank: "",
    verification: "pending" as Verification,
  });
  const [formMsg, setFormMsg] = useState<string | null>(null);

  const submitClaim = async () => {
    setFormMsg(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/claim", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            handle: form.handle,
            displayName: form.displayName || undefined,
            bank: form.bank || undefined,
            verification: form.verification,
          }),
        });

        if (res.status === 409) {
          setFormMsg("That handle is already claimed.");
          return;
        }
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as
            | { error?: string }
            | null;
          setFormMsg(body?.error ? `Error: ${body.error}` : "Claim failed.");
          return;
        }

        setFormMsg("Claim created.");
        setForm({ handle: "", displayName: "", bank: "", verification: "pending" });
        setPage(0);
        fetchClaims();
      } catch (e) {
        setFormMsg(e instanceof Error ? e.message : "Claim failed.");
      }
    });
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
              Add a claim (demo)
            </div>
            <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
              Creates a claimed handle so you can test resolves and admin metrics.
            </div>
          </div>
          <Badge tone="orange">Writes to local JSON</Badge>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-12">
          <div className="md:col-span-4">
            <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
              Handle
            </label>
            <div className="mt-2 flex items-center gap-2 rounded-2xl border border-zinc-200/70 bg-white/70 px-3 py-2 shadow-sm backdrop-blur dark:border-zinc-800/70 dark:bg-zinc-950/25">
              <span className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
                ₦
              </span>
              <input
                value={form.handle}
                onChange={(e) => setForm((p) => ({ ...p, handle: e.target.value }))}
                placeholder="victor"
                className="w-full bg-transparent text-sm font-medium text-zinc-950 outline-none placeholder:text-zinc-400 dark:text-zinc-50 dark:placeholder:text-zinc-500"
              />
            </div>
          </div>

          <div className="md:col-span-4">
            <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
              Display name
            </label>
            <input
              value={form.displayName}
              onChange={(e) =>
                setForm((p) => ({ ...p, displayName: e.target.value }))
              }
              placeholder="Victor Adeyemi"
              className="mt-2 w-full rounded-2xl border border-zinc-200/70 bg-white/70 px-3 py-2 text-sm font-medium text-zinc-950 shadow-sm backdrop-blur outline-none placeholder:text-zinc-400 focus-visible:ring-2 focus-visible:ring-orange-200 dark:border-zinc-800/70 dark:bg-zinc-950/25 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus-visible:ring-orange-900/50"
            />
          </div>

          <div className="md:col-span-3">
            <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
              Bank
            </label>
            <input
              value={form.bank}
              onChange={(e) => setForm((p) => ({ ...p, bank: e.target.value }))}
              placeholder="GTBank"
              className="mt-2 w-full rounded-2xl border border-zinc-200/70 bg-white/70 px-3 py-2 text-sm font-medium text-zinc-950 shadow-sm backdrop-blur outline-none placeholder:text-zinc-400 focus-visible:ring-2 focus-visible:ring-orange-200 dark:border-zinc-800/70 dark:bg-zinc-950/25 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus-visible:ring-orange-900/50"
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
              Status
            </label>
            <select
              value={form.verification}
              onChange={(e) =>
                setForm((p) => ({ ...p, verification: e.target.value as Verification }))
              }
              className="mt-2 w-full rounded-2xl border border-zinc-200/70 bg-white/70 px-3 py-2 text-sm font-semibold text-zinc-950 shadow-sm backdrop-blur outline-none focus-visible:ring-2 focus-visible:ring-orange-200 dark:border-zinc-800/70 dark:bg-zinc-950/25 dark:text-zinc-50 dark:focus-visible:ring-orange-900/50"
            >
              <option value="pending">pending</option>
              <option value="verified">verified</option>
              <option value="business">business</option>
            </select>
          </div>
        </div>

        <div className="mt-5 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-zinc-600 dark:text-zinc-300">
            {formMsg ? (
              <span
                className={cn(
                  "font-semibold",
                  formMsg.startsWith("Error") || formMsg.includes("failed")
                    ? "text-rose-700 dark:text-rose-300"
                    : "text-emerald-700 dark:text-emerald-300"
                )}
              >
                {formMsg}
              </span>
            ) : (
              <span>
                Tip: resolves show best with{" "}
                <NairaTermBadge term="handle" tone="orange" /> + name + bank.
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={submitClaim}
            disabled={isPending}
            className={cn(
              "inline-flex items-center justify-center rounded-full bg-nt-orange px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            )}
          >
            Create claim
          </button>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
              Claimed handles
            </div>
            <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
              {data ? `${data.total.toLocaleString()} total` : "—"}
            </div>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search handle, name, bank…"
              className="w-full rounded-full border border-zinc-200/70 bg-white/70 px-4 py-2 text-sm font-medium text-zinc-950 shadow-sm backdrop-blur outline-none placeholder:text-zinc-400 focus-visible:ring-2 focus-visible:ring-orange-200 dark:border-zinc-800/70 dark:bg-zinc-950/25 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus-visible:ring-orange-900/50 sm:w-80"
            />
            <button
              type="button"
              onClick={() => {
                setPage(0);
                fetchClaims();
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
                <th className="py-2 pr-4">Handle</th>
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Bank</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Claimed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60">
              {(data?.items ?? []).length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="py-4 text-sm text-zinc-600 dark:text-zinc-300"
                  >
                    No results.
                  </td>
                </tr>
              ) : (
                (data?.items ?? []).map((c) => (
                  <tr key={c.id} className="text-zinc-900 dark:text-zinc-50">
                    <td className="py-3 pr-4 font-mono text-xs">₦{c.handle}</td>
                    <td className="py-3 pr-4">{c.displayName}</td>
                    <td className="py-3 pr-4">{c.bank}</td>
                    <td className="py-3 pr-4">
                      <Badge
                        tone={toneForVerification(c.verification)}
                        className="px-2 py-0.5 text-[11px]"
                      >
                        {c.verification}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4 text-xs text-zinc-500 dark:text-zinc-400">
                      {new Date(c.claimedAt).toLocaleString()}
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
            {isPending ? " (loading…)" : ""}
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

