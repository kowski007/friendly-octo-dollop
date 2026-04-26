"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import type {
  AdminNameIndexEntry,
  AdminNameIndexSummary,
} from "@/lib/adminTypes";
import type { NameCategory, NameIndexCurrency } from "@/lib/nameIndex";
import { Badge, Card, cn } from "@/components/nairatag/ui";

type DataResponse = {
  total: number;
  items: AdminNameIndexEntry[];
  summary: AdminNameIndexSummary;
};

type Filters = {
  q: string;
  category: NameCategory | "all";
  status:
    | "all"
    | "available"
    | "premium"
    | "protected"
    | "blocked"
    | "taken"
    | "listed"
    | "unlisted";
  source: "all" | "seed" | "override";
};

type EditorState = {
  handle: string;
  category: NameCategory;
  badge: string;
  price: string;
  currency: NameIndexCurrency | "";
  claimable: boolean;
  purchasable: boolean;
  requestable: boolean;
  reason: string;
  owner_type: string;
};

const limit = 25;

function defaultsForCategory(category: NameCategory) {
  if (category === "premium") {
    return { claimable: false, purchasable: true, requestable: false };
  }
  if (category === "protected") {
    return { claimable: false, purchasable: false, requestable: true };
  }
  if (category === "blocked") {
    return { claimable: false, purchasable: false, requestable: false };
  }
  return { claimable: true, purchasable: false, requestable: false };
}

function toneForCategory(category: NameCategory) {
  if (category === "premium") return "orange" as const;
  if (category === "protected") return "neutral" as const;
  if (category === "blocked") return "neutral" as const;
  return "verify" as const;
}

function toneForAvailability(status: AdminNameIndexEntry["availability"]["status"]) {
  if (status === "available") return "verify" as const;
  if (status === "premium") return "orange" as const;
  if (status === "protected") return "neutral" as const;
  if (status === "blocked") return "neutral" as const;
  if (status === "taken") return "neutral" as const;
  return "neutral" as const;
}

function formatCurrency(amount?: number | null, currency?: string | null) {
  if (!amount || !currency) return "—";
  if (currency === "NGN") {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    }).format(amount);
  }

  return `${currency} ${amount.toLocaleString()}`;
}

function buildEditor(entry: AdminNameIndexEntry): EditorState {
  return {
    handle: entry.handle,
    category: entry.record.category,
    badge: entry.record.badge ?? "",
    price: entry.record.price ? String(entry.record.price) : "",
    currency: entry.record.currency ?? "",
    claimable: entry.record.claimable,
    purchasable: entry.record.purchasable,
    requestable: entry.record.requestable,
    reason: entry.record.reason ?? "",
    owner_type: entry.record.owner_type ?? "",
  };
}

function StatCard({
  label,
  value,
  meta,
}: {
  label: string;
  value: string;
  meta: string;
}) {
  return (
    <Card className="p-5">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
        {label}
      </div>
      <div className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
        {value}
      </div>
      <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">{meta}</div>
    </Card>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200/70 bg-white/70 px-4 py-3 text-sm font-medium text-zinc-900 shadow-sm dark:border-zinc-800/70 dark:bg-zinc-950/25 dark:text-zinc-100">
      <span>{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 items-center rounded-full transition",
          checked ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-700"
        )}
      >
        <span
          className={cn(
            "inline-block h-5 w-5 rounded-full bg-white shadow-sm transition",
            checked ? "translate-x-5" : "translate-x-1"
          )}
        />
      </button>
    </label>
  );
}

export function AdminNameIndex() {
  const [filters, setFilters] = useState<Filters>({
    q: "",
    category: "all",
    status: "all",
    source: "all",
  });
  const [page, setPage] = useState(0);
  const [data, setData] = useState<DataResponse | null>(null);
  const [selected, setSelected] = useState<AdminNameIndexEntry | null>(null);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const totalPages = useMemo(() => {
    const total = data?.total ?? 0;
    return Math.max(1, Math.ceil(total / limit));
  }, [data]);

  const fetchData = () => {
    startTransition(async () => {
      try {
        setError(null);
        const params = new URLSearchParams();
        params.set("limit", String(limit));
        params.set("offset", String(page * limit));
        if (filters.q.trim()) params.set("q", filters.q.trim());
        if (filters.category !== "all") params.set("category", filters.category);
        if (filters.status !== "all") params.set("status", filters.status);
        if (filters.source !== "all") params.set("source", filters.source);

        const res = await fetch(`/api/admin/name-index?${params.toString()}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Failed to load name index");
        const json = (await res.json()) as DataResponse;
        setData(json);

        if (selected) {
          const fresh = json.items.find((entry) => entry.handle === selected.handle) ?? null;
          setSelected(fresh);
          setEditor(fresh ? buildEditor(fresh) : null);
        }
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : "Unknown error");
      }
    });
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  useEffect(() => {
    setPage(0);
  }, [filters.category, filters.status, filters.source]);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.category, filters.status, filters.source]);

  const selectEntry = (entry: AdminNameIndexEntry) => {
    setSelected(entry);
    setEditor(buildEditor(entry));
    setMessage(null);
    setError(null);
  };

  const saveOverride = () => {
    if (!editor) return;

    startTransition(async () => {
      try {
        setError(null);
        setMessage(null);
        const res = await fetch(`/api/admin/name-index/${editor.handle}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            category: editor.category,
            badge: editor.badge || null,
            price: editor.price ? Number(editor.price) : null,
            currency: editor.currency || null,
            claimable: editor.claimable,
            purchasable: editor.purchasable,
            requestable: editor.requestable,
            reason: editor.reason || null,
            owner_type: editor.owner_type || null,
            actor: "admin_ui",
          }),
        });

        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        if (!res.ok) {
          throw new Error(body?.error ?? "Unable to save rule");
        }

        setMessage(`Saved ${editor.handle}`);
        fetchData();
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : "Unable to save rule");
      }
    });
  };

  const resetOverride = () => {
    if (!selected?.overrideRecord) return;

    startTransition(async () => {
      try {
        setError(null);
        setMessage(null);
        const res = await fetch(`/api/admin/name-index/${selected.handle}`, {
          method: "DELETE",
        });
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        if (!res.ok) {
          throw new Error(body?.error ?? "Unable to reset rule");
        }

        setMessage(`Reset ${selected.handle} to seed rules`);
        fetchData();
      } catch (resetError) {
        setError(
          resetError instanceof Error ? resetError.message : "Unable to reset rule"
        );
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Indexed names"
          value={data ? data.summary.totalNames.toLocaleString() : "—"}
          meta={
            data
              ? `${data.summary.publicNames.toLocaleString()} public, ${data.summary.premiumNames.toLocaleString()} premium`
              : "Loading live index"
          }
        />
        <StatCard
          label="Protected / blocked"
          value={
            data
              ? `${data.summary.protectedNames + data.summary.blockedNames}`
              : "—"
          }
          meta={
            data
              ? `${data.summary.protectedNames.toLocaleString()} reserved, ${data.summary.blockedNames.toLocaleString()} blocked`
              : "Reserved safety layer"
          }
        />
        <StatCard
          label="Admin overrides"
          value={data ? data.summary.overrideCount.toLocaleString() : "—"}
          meta={
            data
              ? `${data.summary.premiumPurchasableNames.toLocaleString()} premium purchasable`
              : "Live runtime changes"
          }
        />
        <StatCard
          label="Claim / listing pressure"
          value={
            data
              ? `${data.summary.claimedNames.toLocaleString()} / ${data.summary.listedNames.toLocaleString()}`
              : "—"
          }
          meta="Claimed handles / active resale listings"
        />
      </div>

      <Card className="p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex-1">
            <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
              Live index manager
            </div>
            <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
              Search any handle, inspect its seed rule, then override category,
              pricing, and safety flags without touching the JSON seed file.
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <input
              value={filters.q}
              onChange={(event) =>
                setFilters((current) => ({ ...current, q: event.target.value }))
              }
              placeholder="Search handle, badge, reason..."
              className="rounded-full border border-zinc-200/70 bg-white/70 px-4 py-2 text-sm font-medium text-zinc-950 shadow-sm outline-none placeholder:text-zinc-400 focus-visible:ring-2 focus-visible:ring-emerald-200 dark:border-zinc-800/70 dark:bg-zinc-950/25 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus-visible:ring-emerald-900/40"
            />
            <select
              value={filters.category}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  category: event.target.value as Filters["category"],
                }))
              }
              className="rounded-full border border-zinc-200/70 bg-white/70 px-4 py-2 text-sm font-semibold text-zinc-950 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 dark:border-zinc-800/70 dark:bg-zinc-950/25 dark:text-zinc-50 dark:focus-visible:ring-emerald-900/40"
            >
              <option value="all">All categories</option>
              <option value="public">Public</option>
              <option value="premium">Premium</option>
              <option value="protected">Protected</option>
              <option value="blocked">Blocked</option>
            </select>
            <select
              value={filters.status}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  status: event.target.value as Filters["status"],
                }))
              }
              className="rounded-full border border-zinc-200/70 bg-white/70 px-4 py-2 text-sm font-semibold text-zinc-950 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 dark:border-zinc-800/70 dark:bg-zinc-950/25 dark:text-zinc-50 dark:focus-visible:ring-emerald-900/40"
            >
              <option value="all">All states</option>
              <option value="available">Available</option>
              <option value="premium">Premium</option>
              <option value="protected">Reserved</option>
              <option value="blocked">Blocked</option>
              <option value="taken">Taken</option>
              <option value="listed">Listed</option>
              <option value="unlisted">Unlisted</option>
            </select>
            <select
              value={filters.source}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  source: event.target.value as Filters["source"],
                }))
              }
              className="rounded-full border border-zinc-200/70 bg-white/70 px-4 py-2 text-sm font-semibold text-zinc-950 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 dark:border-zinc-800/70 dark:bg-zinc-950/25 dark:text-zinc-50 dark:focus-visible:ring-emerald-900/40"
            >
              <option value="all">Seed + overrides</option>
              <option value="seed">Seed only</option>
              <option value="override">Overrides only</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setPage(0);
              fetchData();
            }}
            className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
          >
            Search index
          </button>
          <button
            type="button"
            onClick={() => {
              setFilters({ q: "", category: "all", status: "all", source: "all" });
              setPage(0);
            }}
            className="rounded-full border border-zinc-200/70 bg-white/70 px-4 py-2 text-sm font-semibold text-zinc-900 shadow-sm transition hover:bg-white dark:border-zinc-800/70 dark:bg-zinc-950/30 dark:text-zinc-50 dark:hover:bg-zinc-950/45"
          >
            Reset filters
          </button>
          {isPending ? (
            <span className="text-sm text-zinc-500 dark:text-zinc-400">Refreshing…</span>
          ) : null}
          {message ? (
            <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
              {message}
            </span>
          ) : null}
          {error ? (
            <span className="text-sm font-semibold text-rose-700 dark:text-rose-300">
              {error}
            </span>
          ) : null}
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_420px]">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-zinc-200/70 px-6 py-4 dark:border-zinc-800/70">
            <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
              Index records
            </div>
            <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
              {data ? `${data.total.toLocaleString()} matching names` : "Loading..."}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200/60 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:border-zinc-800/60 dark:text-zinc-400">
                  <th className="px-6 py-3">Handle</th>
                  <th className="px-6 py-3">Rule</th>
                  <th className="px-6 py-3">State</th>
                  <th className="px-6 py-3">Price</th>
                  <th className="px-6 py-3">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60">
                {(data?.items ?? []).length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-5 text-sm text-zinc-600 dark:text-zinc-300"
                    >
                      No indexed names match this filter.
                    </td>
                  </tr>
                ) : (
                  (data?.items ?? []).map((entry) => (
                    <tr
                      key={entry.handle}
                      onClick={() => selectEntry(entry)}
                      className={cn(
                        "cursor-pointer align-top transition hover:bg-zinc-50/80 dark:hover:bg-zinc-900/30",
                        selected?.handle === entry.handle &&
                          "bg-emerald-50/80 dark:bg-emerald-950/20"
                      )}
                    >
                      <td className="px-6 py-4">
                        <div className="font-mono text-xs font-semibold text-zinc-950 dark:text-zinc-50">
                          {entry.displayHandle}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          {entry.claimed ? <Badge tone="verify">claimed</Badge> : null}
                          {entry.listed ? <Badge tone="orange">listed</Badge> : null}
                          {entry.overrideRecord ? (
                            <Badge tone="neutral">override live</Badge>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone={toneForCategory(entry.record.category)}>
                            {entry.record.badge ?? entry.record.category}
                          </Badge>
                        </div>
                        <div className="mt-2 max-w-[18rem] text-sm text-zinc-600 dark:text-zinc-300">
                          {entry.record.reason || "No policy note set yet."}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge tone={toneForAvailability(entry.availability.status)}>
                          {entry.availability.status}
                        </Badge>
                        <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                          {entry.claim?.displayName ?? "Unclaimed"}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-semibold text-zinc-900 dark:text-zinc-50">
                        {formatCurrency(entry.record.price, entry.record.currency)}
                      </td>
                      <td className="px-6 py-4">
                        <Badge tone={entry.source === "override" ? "orange" : "neutral"}>
                          {entry.source}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col items-start justify-between gap-3 border-t border-zinc-200/70 px-6 py-4 text-sm text-zinc-600 dark:border-zinc-800/70 dark:text-zinc-300 sm:flex-row sm:items-center">
            <span>
              Page {page + 1} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(0, current - 1))}
                disabled={page === 0 || isPending}
                className="rounded-full border border-zinc-200/70 bg-white/70 px-4 py-2 font-semibold text-zinc-900 shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-800/70 dark:bg-zinc-950/30 dark:text-zinc-50 dark:hover:bg-zinc-950/45"
              >
                Prev
              </button>
              <button
                type="button"
                onClick={() =>
                  setPage((current) => Math.min(totalPages - 1, current + 1))
                }
                disabled={page >= totalPages - 1 || isPending}
                className="rounded-full border border-zinc-200/70 bg-white/70 px-4 py-2 font-semibold text-zinc-900 shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-800/70 dark:bg-zinc-950/30 dark:text-zinc-50 dark:hover:bg-zinc-950/45"
              >
                Next
              </button>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          {selected && editor ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <div className="font-mono text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                  ₦{selected.handle}
                </div>
                <Badge tone={toneForCategory(selected.record.category)}>
                  {selected.record.category}
                </Badge>
                {selected.overrideRecord ? <Badge tone="orange">override</Badge> : null}
              </div>

              <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                Seed rule:{" "}
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {selected.seedRecord?.category ?? "custom"}
                </span>
                {selected.claim ? ` · owner ${selected.claim.displayName}` : " · unclaimed"}
              </div>

              <div className="mt-6 grid gap-4">
                <div>
                  <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                    Category
                  </label>
                  <select
                    value={editor.category}
                    onChange={(event) => {
                      const nextCategory = event.target.value as NameCategory;
                      const nextFlags = defaultsForCategory(nextCategory);
                      setEditor((current) =>
                        current
                          ? {
                              ...current,
                              category: nextCategory,
                              claimable: nextFlags.claimable,
                              purchasable: nextFlags.purchasable,
                              requestable: nextFlags.requestable,
                            }
                          : current
                      );
                    }}
                    className="mt-2 w-full rounded-2xl border border-zinc-200/70 bg-white/70 px-4 py-3 text-sm font-semibold text-zinc-950 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 dark:border-zinc-800/70 dark:bg-zinc-950/25 dark:text-zinc-50 dark:focus-visible:ring-emerald-900/40"
                  >
                    <option value="public">Public</option>
                    <option value="premium">Premium</option>
                    <option value="protected">Protected</option>
                    <option value="blocked">Blocked</option>
                  </select>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                      Badge
                    </label>
                    <input
                      value={editor.badge}
                      onChange={(event) =>
                        setEditor((current) =>
                          current ? { ...current, badge: event.target.value } : current
                        )
                      }
                      placeholder="Premium"
                      className="mt-2 w-full rounded-2xl border border-zinc-200/70 bg-white/70 px-4 py-3 text-sm font-medium text-zinc-950 shadow-sm outline-none placeholder:text-zinc-400 focus-visible:ring-2 focus-visible:ring-emerald-200 dark:border-zinc-800/70 dark:bg-zinc-950/25 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus-visible:ring-emerald-900/40"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                      Owner type
                    </label>
                    <input
                      value={editor.owner_type}
                      onChange={(event) =>
                        setEditor((current) =>
                          current
                            ? { ...current, owner_type: event.target.value }
                            : current
                        )
                      }
                      placeholder="government"
                      className="mt-2 w-full rounded-2xl border border-zinc-200/70 bg-white/70 px-4 py-3 text-sm font-medium text-zinc-950 shadow-sm outline-none placeholder:text-zinc-400 focus-visible:ring-2 focus-visible:ring-emerald-200 dark:border-zinc-800/70 dark:bg-zinc-950/25 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus-visible:ring-emerald-900/40"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-[1fr_124px]">
                  <div>
                    <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                      Price
                    </label>
                    <input
                      value={editor.price}
                      onChange={(event) =>
                        setEditor((current) =>
                          current ? { ...current, price: event.target.value } : current
                        )
                      }
                      placeholder="5000"
                      className="mt-2 w-full rounded-2xl border border-zinc-200/70 bg-white/70 px-4 py-3 text-sm font-medium text-zinc-950 shadow-sm outline-none placeholder:text-zinc-400 focus-visible:ring-2 focus-visible:ring-emerald-200 dark:border-zinc-800/70 dark:bg-zinc-950/25 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus-visible:ring-emerald-900/40"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                      Currency
                    </label>
                    <select
                      value={editor.currency}
                      onChange={(event) =>
                        setEditor((current) =>
                          current
                            ? {
                                ...current,
                                currency: event.target.value as NameIndexCurrency | "",
                              }
                            : current
                        )
                      }
                      className="mt-2 w-full rounded-2xl border border-zinc-200/70 bg-white/70 px-4 py-3 text-sm font-semibold text-zinc-950 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 dark:border-zinc-800/70 dark:bg-zinc-950/25 dark:text-zinc-50 dark:focus-visible:ring-emerald-900/40"
                    >
                      <option value="">None</option>
                      <option value="NGN">NGN</option>
                      <option value="USD">USD</option>
                      <option value="USDC">USDC</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                    Reason
                  </label>
                  <textarea
                    value={editor.reason}
                    onChange={(event) =>
                      setEditor((current) =>
                        current ? { ...current, reason: event.target.value } : current
                      )
                    }
                    rows={4}
                    placeholder="Protected brand name"
                    className="mt-2 w-full rounded-3xl border border-zinc-200/70 bg-white/70 px-4 py-3 text-sm leading-6 text-zinc-950 shadow-sm outline-none placeholder:text-zinc-400 focus-visible:ring-2 focus-visible:ring-emerald-200 dark:border-zinc-800/70 dark:bg-zinc-950/25 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus-visible:ring-emerald-900/40"
                  />
                </div>

                <div className="grid gap-3">
                  <Toggle
                    label="Claimable"
                    checked={editor.claimable}
                    onChange={(next) =>
                      setEditor((current) =>
                        current ? { ...current, claimable: next } : current
                      )
                    }
                  />
                  <Toggle
                    label="Purchasable"
                    checked={editor.purchasable}
                    onChange={(next) =>
                      setEditor((current) =>
                        current ? { ...current, purchasable: next } : current
                      )
                    }
                  />
                  <Toggle
                    label="Requestable"
                    checked={editor.requestable}
                    onChange={(next) =>
                      setEditor((current) =>
                        current ? { ...current, requestable: next } : current
                      )
                    }
                  />
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={saveOverride}
                    disabled={isPending}
                    className="rounded-full bg-emerald-500 px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Save override
                  </button>
                  <button
                    type="button"
                    onClick={resetOverride}
                    disabled={!selected.overrideRecord || isPending}
                    className="rounded-full border border-zinc-200/70 bg-white/70 px-5 py-3 text-sm font-semibold text-zinc-900 shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-800/70 dark:bg-zinc-950/30 dark:text-zinc-50 dark:hover:bg-zinc-950/45"
                  >
                    Reset to seed
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-3xl border border-dashed border-zinc-300/70 px-6 py-12 text-center text-sm text-zinc-600 dark:border-zinc-700/70 dark:text-zinc-300">
              Select a name from the index table to edit its marketplace and claim
              rules.
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
