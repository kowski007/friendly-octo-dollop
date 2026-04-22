"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";

import type {
  AdminMetrics,
  ApiLogRecord,
  ClaimRecord,
  MarketplaceTransferDetail,
  NotificationRecord,
} from "@/lib/adminTypes";
import { Badge, Card, NairaTermBadge, cn } from "@/components/nairatag/ui";

type Paged<T> = { total: number; items: T[] };

function formatPct(value: number | null) {
  if (value === null) return "—";
  return `${Math.round(value * 100)}%`;
}

function formatMs(value: number | null) {
  if (value === null) return "—";
  return `${Math.round(value)}ms`;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

function dayLabel(day: string) {
  // YYYY-MM-DD -> Mon 04/15
  const [y, m, d] = day.split("-").map((n) => Number(n));
  if (!y || !m || !d) return day;
  const dt = new Date(Date.UTC(y, m - 1, d));
  const wd = dt.toLocaleDateString(undefined, { weekday: "short" });
  return `${wd} ${String(m).padStart(2, "0")}/${String(d).padStart(2, "0")}`;
}

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

function deliveryTone(status?: NotificationRecord["deliveryStatus"]) {
  if (status === "delivered") return "verify";
  if (status === "failed") return "orange";
  return "neutral";
}

export function AdminDashboard() {
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [claims, setClaims] = useState<Paged<ClaimRecord> | null>(null);
  const [logs, setLogs] = useState<Paged<ApiLogRecord> | null>(null);
  const [transfers, setTransfers] = useState<Paged<MarketplaceTransferDetail> | null>(
    null
  );
  const [notifications, setNotifications] = useState<Paged<NotificationRecord> | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const refresh = useCallback(() => {
    startTransition(async () => {
      try {
        setError(null);
        const [mRes, cRes, lRes, tRes, nRes] = await Promise.all([
          fetch("/api/admin/metrics", { cache: "no-store" }),
          fetch("/api/admin/claims?limit=8", { cache: "no-store" }),
          fetch("/api/admin/logs?limit=10", { cache: "no-store" }),
          fetch("/api/admin/marketplace/transfers?limit=6&status=pending_review", {
            cache: "no-store",
          }),
          fetch("/api/admin/notifications?limit=6&unread=1", {
            cache: "no-store",
          }),
        ]);

        if (!mRes.ok) throw new Error("Failed to load metrics");
        if (!cRes.ok) throw new Error("Failed to load claims");
        if (!lRes.ok) throw new Error("Failed to load logs");
        if (!tRes.ok) throw new Error("Failed to load transfers");
        if (!nRes.ok) throw new Error("Failed to load notifications");

        const [m, c, l, t, n] = await Promise.all([
          mRes.json(),
          cRes.json(),
          lRes.json(),
          tRes.json(),
          nRes.json(),
        ]);
        setMetrics(m as AdminMetrics);
        setClaims(c as Paged<ClaimRecord>);
        setLogs(l as Paged<ApiLogRecord>);
        setTransfers(t as Paged<MarketplaceTransferDetail>);
        setNotifications(n as Paged<NotificationRecord>);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unknown error");
      }
    });
  }, [startTransition]);

  useEffect(() => {
    refresh();
    const id = window.setInterval(refresh, 10000);
    return () => window.clearInterval(id);
  }, [refresh]);

  const maxCalls = useMemo(() => {
    const counts = metrics?.callsLast7Days?.map((d) => d.count) ?? [];
    return Math.max(1, ...counts);
  }, [metrics]);

  const topEndpoints = metrics?.topEndpoints ?? [];
  const callsLast7 = metrics?.callsLast7Days ?? [];

  const reviewTransfer = useCallback(
    (transferId: string, action: "approve" | "reject") => {
      startTransition(async () => {
        try {
          setError(null);
          const res = await fetch(
            `/api/admin/marketplace/transfers/${transferId}`,
            {
              method: "PATCH",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                action,
                reviewNote:
                  action === "approve"
                    ? "Approved from admin review queue"
                    : "Rejected from admin review queue",
              }),
            }
          );

          if (!res.ok) {
            const body = (await res.json().catch(() => null)) as
              | { error?: string }
              | null;
            throw new Error(body?.error ?? "Transfer review failed");
          }

          refresh();
        } catch (e) {
          setError(e instanceof Error ? e.message : "Transfer review failed");
        }
      });
    },
    [refresh, startTransition]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <Badge tone="neutral">Live</Badge>
          <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
            Auto-refresh every 10s
          </span>
          {isPending ? (
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              Refreshing…
            </span>
          ) : null}
        </div>

        <button
          type="button"
          onClick={refresh}
          className="rounded-full border border-zinc-200/70 bg-white/70 px-4 py-2 text-sm font-semibold text-zinc-900 shadow-sm backdrop-blur transition hover:bg-white dark:border-zinc-800/70 dark:bg-zinc-950/30 dark:text-zinc-50 dark:hover:bg-zinc-950/45"
        >
          Refresh
        </button>
      </div>

      {error ? (
        <Card className="p-5">
          <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
            Couldn’t load admin data
          </div>
          <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
            {error}
          </div>
        </Card>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-6">
          <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Total handles
          </div>
          <div className="mt-3 text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            {metrics ? metrics.totalClaims.toLocaleString() : "—"}
          </div>
          <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
            {metrics ? `+${metrics.claimsToday.toLocaleString()} today` : "—"}
          </div>
        </Card>

        <Card className="p-6">
          <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Verified handles
          </div>
          <div className="mt-3 text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            {metrics ? metrics.verifiedClaims.toLocaleString() : "—"}
          </div>
          <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
            Identity verified (BVN linked)
          </div>
        </Card>

        <Card className="p-6">
          <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Pending handles
          </div>
          <div className="mt-3 text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            {metrics ? metrics.pendingClaims.toLocaleString() : "—"}
          </div>
          <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
            Claimed, not yet verified
          </div>
        </Card>

        <Card className="p-6">
          <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Total users
          </div>
          <div className="mt-3 text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            {metrics ? metrics.totalUsers.toLocaleString() : "—"}
          </div>
          <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
            Phone-verified identities
          </div>
        </Card>

        <Card className="p-6">
          <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            BVN linked users
          </div>
          <div className="mt-3 text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            {metrics ? metrics.bvnLinkedUsers.toLocaleString() : "—"}
          </div>
          <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
            Strong verification signal
          </div>
        </Card>

        <Card className="p-6">
          <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Bank linked users
          </div>
          <div className="mt-3 text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            {metrics ? metrics.bankLinkedUsers.toLocaleString() : "â€”"}
          </div>
          <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
            Payout destinations saved
          </div>
        </Card>

        <Card className="p-6">
          <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            API calls
          </div>
          <div className="mt-3 text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            {metrics ? metrics.totalApiCalls.toLocaleString() : "—"}
          </div>
          <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
            {metrics ? `+${metrics.apiCallsToday.toLocaleString()} today` : "—"}
          </div>
        </Card>

        <Card className="p-6">
          <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Success rate (24h)
          </div>
          <div className="mt-3 text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            {formatPct(metrics?.successRate24h ?? null)}
          </div>
          <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
            2xx/3xx responses in last 24h
          </div>
        </Card>

        <Card className="p-6">
          <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Avg latency (24h)
          </div>
          <div className="mt-3 text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            {formatMs(metrics?.avgLatency24h ?? null)}
          </div>
          <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
            Measured server-side
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
              Marketplace transfer review
            </div>
            <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
              Accepted offers waiting for Phase 2 approval.
            </div>
          </div>
          <Badge tone="orange">
            {transfers ? transfers.total.toLocaleString() : "0"} pending
          </Badge>
        </div>

        <div className="mt-5 space-y-3">
          {(transfers?.items ?? []).length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-300/70 px-4 py-6 text-sm text-zinc-600 dark:border-zinc-700/70 dark:text-zinc-300">
              No transfer reviews are open.
            </div>
          ) : (
            (transfers?.items ?? []).map((transfer) => (
              <div
                key={transfer.id}
                className="rounded-2xl border border-zinc-200/70 bg-white/60 p-4 shadow-sm backdrop-blur dark:border-zinc-800/70 dark:bg-zinc-950/30"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                        â‚¦{transfer.handle}
                      </span>
                      <Badge tone="orange">{transfer.status.replace("_", " ")}</Badge>
                      <Badge tone="neutral">{formatCurrency(transfer.amount)}</Badge>
                    </div>
                    <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                      Seller {transfer.seller?.phone ?? transfer.sellerUserId} · Buyer{" "}
                      {transfer.buyerName} ({transfer.buyerPhone})
                    </div>
                    <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      Current trust {transfer.currentReputation?.trustScore ?? 12}/100 · opened{" "}
                      {new Date(transfer.createdAt).toLocaleString()}
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => reviewTransfer(transfer.id, "approve")}
                      disabled={isPending}
                      className="rounded-full bg-nt-orange px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => reviewTransfer(transfer.id, "reject")}
                      disabled={isPending}
                      className="rounded-full border border-zinc-300/70 bg-white/80 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700/80 dark:bg-zinc-950/30 dark:text-zinc-50 dark:hover:bg-zinc-900/50"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
              Notification delivery
            </div>
            <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
              In-app alerts plus signed webhook delivery when configured.
            </div>
          </div>
          <Badge tone="neutral">
            {notifications ? notifications.total.toLocaleString() : "0"} unread
          </Badge>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {(notifications?.items ?? []).length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-300/70 px-4 py-6 text-sm text-zinc-600 dark:border-zinc-700/70 dark:text-zinc-300 lg:col-span-2">
              No unread notifications.
            </div>
          ) : (
            (notifications?.items ?? []).map((notification) => (
              <div
                key={notification.id}
                className="rounded-2xl border border-zinc-200/70 bg-white/60 p-4 shadow-sm backdrop-blur dark:border-zinc-800/70 dark:bg-zinc-950/30"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                      {notification.title}
                    </div>
                    <div className="mt-1 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                      {notification.body}
                    </div>
                  </div>
                  <Badge tone={deliveryTone(notification.deliveryStatus)}>
                    {notification.deliveryStatus ?? "in-app"}
                  </Badge>
                </div>
                {notification.deliveryError ? (
                  <div className="mt-2 text-xs text-orange-700 dark:text-orange-200">
                    {notification.deliveryError}
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-12">
        <Card className="p-6 lg:col-span-7">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                Calls (last 7 days)
              </div>
              <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                All logged endpoints
              </div>
            </div>
            <Badge tone="neutral" className="hidden sm:inline-flex">
              {metrics ? metrics.totalApiCalls.toLocaleString() : "—"} total
            </Badge>
          </div>

          <div className="mt-6 grid h-28 grid-cols-7 items-end gap-2">
            {callsLast7.map((d) => {
              const pct = Math.max(6, Math.round((d.count / maxCalls) * 100));
              return (
                <div key={d.day} className="flex flex-col items-stretch gap-2">
                  <div
                    className="rounded-xl bg-orange-500/20 shadow-sm"
                    style={{ height: `${pct}%` }}
                    title={`${d.count} calls`}
                  >
                    <div className="h-full w-full rounded-xl bg-gradient-to-b from-orange-500/15 to-transparent" />
                  </div>
                  <div className="text-center text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
                    {dayLabel(d.day).slice(0, 3)}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-6 lg:col-span-5">
          <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
            Top endpoints
          </div>
          <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
            Most called routes
          </div>

          <div className="mt-5 space-y-3">
            {topEndpoints.length === 0 ? (
              <div className="text-sm text-zinc-600 dark:text-zinc-300">
                No API logs yet. Try a{" "}
                <NairaTermBadge term="handle" tone="orange" /> resolve or create
                a claim.
              </div>
            ) : (
              topEndpoints.map((e) => (
                <div
                  key={e.endpoint}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-zinc-200/60 bg-white/50 px-4 py-3 text-sm shadow-sm backdrop-blur dark:border-zinc-800/70 dark:bg-zinc-950/25"
                >
                  <div className="font-mono text-xs text-zinc-700 dark:text-zinc-200">
                    {e.endpoint}
                  </div>
                  <Badge tone="neutral" className="px-2 py-0.5 text-[11px]">
                    {e.count}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-12">
        <Card className="p-6 lg:col-span-7">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                Recent claims
              </div>
              <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                Latest claimed handles
              </div>
            </div>
            <Link
              href="/admin/claims"
              className="text-sm font-semibold text-zinc-900 underline decoration-zinc-300 underline-offset-4 transition hover:decoration-zinc-500 dark:text-zinc-50 dark:decoration-zinc-600 dark:hover:decoration-zinc-300"
            >
              View all
            </Link>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  <th className="py-2 pr-4">Handle</th>
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Bank</th>
                  <th className="py-2 pr-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60">
                {(claims?.items ?? []).length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="py-4 text-sm text-zinc-600 dark:text-zinc-300"
                    >
                      No claims yet.
                    </td>
                  </tr>
                ) : (
                  (claims?.items ?? []).map((c) => (
                    <tr key={c.id} className="text-zinc-900 dark:text-zinc-50">
                      <td className="py-3 pr-4 font-mono text-xs">
                        ₦{c.handle}
                      </td>
                      <td className="py-3 pr-4">{c.displayName}</td>
                      <td className="py-3 pr-4">{c.bank}</td>
                      <td className="py-3 pr-4">
                        <Badge
                          tone={
                            c.verification === "pending"
                              ? "neutral"
                              : "verify"
                          }
                          className="px-2 py-0.5 text-[11px]"
                        >
                          {c.verification}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="p-6 lg:col-span-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                Recent API calls
              </div>
              <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                Last 10 requests
              </div>
            </div>
            <Link
              href="/admin/api"
              className="text-sm font-semibold text-zinc-900 underline decoration-zinc-300 underline-offset-4 transition hover:decoration-zinc-500 dark:text-zinc-50 dark:decoration-zinc-600 dark:hover:decoration-zinc-300"
            >
              View all
            </Link>
          </div>

          <div className="mt-5 space-y-3">
            {(logs?.items ?? []).length === 0 ? (
              <div className="text-sm text-zinc-600 dark:text-zinc-300">
                No API calls logged yet.
              </div>
            ) : (
              (logs?.items ?? []).map((l) => (
                <div
                  key={l.id}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-2xl border border-zinc-200/60 bg-white/50 px-4 py-3 shadow-sm backdrop-blur dark:border-zinc-800/70 dark:bg-zinc-950/25",
                    l.status >= 500 && "border-rose-200/60 dark:border-rose-900/50"
                  )}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-zinc-700 dark:text-zinc-200">
                        {l.method} {l.endpoint}
                      </span>
                      <StatusPill status={l.status} />
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                      <span>{formatMs(l.latencyMs)}</span>
                      {l.handle ? <span>₦{l.handle}</span> : null}
                    </div>
                  </div>
                  <div className="shrink-0 text-[11px] text-zinc-500 dark:text-zinc-400">
                    {new Date(l.ts).toLocaleTimeString(undefined, {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
