"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import { CopyButton } from "./CopyButton";
import { Badge, ButtonLink, Card, Container } from "./ui";

const NAIRA = "\u20A6";

type ReferralDashboard =
  | {
      ok: true;
      referralCode: string;
      referralHandle?: string | null;
      referralUrl: string;
      requiresHandle?: boolean;
      totalReferrals: number;
      convertedReferrals: number;
      referralPoints: number;
      pendingConversionPoints: number;
      signupPointsPerReferral: number;
      conversionPointsPerReferral: number;
      recent: Array<{
        id: string;
        createdAt: string;
        convertedAt?: string;
        points: number;
        signupPoints: number;
        conversionPoints: number;
        referredName: string | null;
        referredHandle: string | null;
      }>;
    }
  | { error: string };

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function formatPoints(value: number) {
  return `${value.toLocaleString()} pts`;
}

function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Card className="p-4">
      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-[1.7rem]">
        {value}
      </div>
      <div className="mt-1 text-xs leading-5 text-zinc-600 dark:text-zinc-300">
        {hint}
      </div>
    </Card>
  );
}

export function ReferralsView() {
  const [data, setData] = useState<ReferralDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const shareText = useMemo(() => {
    if (!data || !("ok" in data) || !data.ok) return "";
    if (data.requiresHandle || !data.referralUrl) return "";
    return `Claim your ${NAIRA}handle on NairaTag: ${data.referralUrl}`;
  }, [data]);

  const load = () => {
    startTransition(async () => {
      try {
        setError(null);
        const res = await fetch("/api/referrals/me", { cache: "no-store" });
        const json = (await res.json().catch(() => ({
          error: "unknown_error",
        }))) as ReferralDashboard;
        setData(json);
        if (!res.ok && "error" in json) {
          setError(json.error);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load referrals");
      }
    });
  };

  useEffect(() => {
    load();
  }, []);

  if (error === "unauthorized") {
    return (
      <Container className="max-w-5xl">
        <Card className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="orange">Referrals</Badge>
            <Badge tone="neutral">Sign in required</Badge>
          </div>
          <div className="mt-4 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-300">
            Sign in first, then copy your username referral link and invite
            people to claim a {NAIRA}handle.
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <ButtonLink href="/claim">Open claim flow</ButtonLink>
            <ButtonLink href="/" variant="secondary">
              Home
            </ButtonLink>
          </div>
        </Card>
      </Container>
    );
  }

  const dashboard = data && "ok" in data && data.ok ? data : null;
  const hasUsernameReferral = Boolean(
    dashboard && !dashboard.requiresHandle && dashboard.referralUrl
  );

  return (
    <Container className="max-w-5xl space-y-5">
      <Card className="p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="orange">Referrals</Badge>
              {isPending ? <Badge tone="neutral">Refreshing</Badge> : null}
              {dashboard?.requiresHandle ? (
                <Badge tone="orange">Claim a handle first</Badge>
              ) : null}
            </div>

            <div className="mt-3 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-[2rem]">
              Share your username link
            </div>
            <div className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-300">
              Earn points when someone signs up with your link, then earn a
              larger bonus when they claim a {NAIRA}handle.
            </div>

            {dashboard?.requiresHandle ? (
              <div className="mt-4 rounded-2xl border border-orange-200/70 bg-orange-50 px-4 py-3 text-sm font-medium text-orange-950 dark:border-orange-900/60 dark:bg-orange-950/25 dark:text-orange-100">
                Claim your {NAIRA}handle first. Your referral link becomes
                <span className="mx-1 font-mono">/r/your_handle</span>
                after that.
              </div>
            ) : null}

            <div className="mt-4 rounded-[1.5rem] border border-zinc-200/70 bg-white/80 p-4 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-950/35">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
                    Your referral link
                  </div>
                  <div className="mt-2 truncate rounded-2xl border border-zinc-200/70 bg-zinc-50/90 px-3 py-3 font-mono text-xs text-zinc-900 dark:border-zinc-800/80 dark:bg-zinc-900/50 dark:text-zinc-50 sm:text-sm">
                    {hasUsernameReferral ? dashboard?.referralUrl : "-"}
                  </div>
                </div>
                <div className="flex shrink-0 gap-2 self-start">
                  <CopyButton
                    value={hasUsernameReferral ? dashboard?.referralUrl ?? "" : ""}
                    className="px-3 py-2 text-xs sm:text-sm"
                  />
                  <CopyButton
                    value={shareText}
                    label="Copy text"
                    copiedLabel="Copied"
                    className="px-3 py-2 text-xs sm:text-sm"
                  />
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2 text-xs text-zinc-600 dark:text-zinc-300">
                <Badge tone="neutral">
                  Username:{" "}
                  <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-50">
                    {hasUsernameReferral ? `${NAIRA}${dashboard?.referralCode}` : "-"}
                  </span>
                </Badge>
                <Badge tone="neutral">
                  /r/{hasUsernameReferral ? dashboard?.referralCode : "username"}
                </Badge>
                {dashboard ? (
                  <Badge tone="verify">
                    +{dashboard.signupPointsPerReferral} signup, +
                    {dashboard.conversionPointsPerReferral} claim
                  </Badge>
                ) : null}
              </div>
            </div>
          </div>

          <div className="grid w-full gap-3 sm:grid-cols-2 lg:w-[320px]">
            <StatTile
              label="Points"
              value={dashboard ? dashboard.referralPoints.toLocaleString() : "-"}
              hint="Earned so far"
            />
            <StatTile
              label="Referrals"
              value={dashboard ? dashboard.totalReferrals.toLocaleString() : "-"}
              hint="Signed up through you"
            />
            <StatTile
              label="Converted"
              value={dashboard ? dashboard.convertedReferrals.toLocaleString() : "-"}
              hint={`Claimed a ${NAIRA}handle`}
            />
            <StatTile
              label="Pending bonus"
              value={
                dashboard ? dashboard.pendingConversionPoints.toLocaleString() : "-"
              }
              hint="Waiting for claim"
            />
          </div>
        </div>
      </Card>

      {error && error !== "unauthorized" ? (
        <Card className="p-4">
          <div className="text-sm font-semibold text-rose-700 dark:text-rose-300">
            {error}
          </div>
        </Card>
      ) : null}

      <Card className="p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
              Recent referrals
            </div>
            <div className="mt-1 text-xs leading-5 text-zinc-600 dark:text-zinc-300">
              Latest signups attributed to your link.
            </div>
          </div>
          <button
            type="button"
            onClick={load}
            className="rounded-full border border-zinc-200/70 bg-white/80 px-3 py-1.5 text-xs font-semibold text-zinc-900 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-800/80 dark:bg-zinc-950/55 dark:text-zinc-50 dark:hover:bg-zinc-900/70"
          >
            Refresh
          </button>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
                <th className="py-2 pr-4">Referred</th>
                <th className="py-2 pr-4">Handle</th>
                <th className="py-2 pr-4">Signed up</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2">Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60">
              {!dashboard || dashboard.recent.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="py-4 text-sm text-zinc-600 dark:text-zinc-300"
                  >
                    No referrals yet.
                  </td>
                </tr>
              ) : (
                dashboard.recent.map((entry) => (
                  <tr key={entry.id} className="text-zinc-900 dark:text-zinc-50">
                    <td className="py-3 pr-4 font-medium">
                      {entry.referredName || "-"}
                    </td>
                    <td className="py-3 pr-4 font-mono text-xs">
                      {entry.referredHandle ? `${NAIRA}${entry.referredHandle}` : "-"}
                    </td>
                    <td className="py-3 pr-4 text-xs text-zinc-500 dark:text-zinc-400">
                      {formatDate(entry.createdAt)}
                    </td>
                    <td className="py-3 pr-4">
                      {entry.convertedAt ? (
                        <Badge tone="verify" className="px-2 py-0.5 text-[11px]">
                          Claimed
                        </Badge>
                      ) : (
                        <Badge tone="neutral" className="px-2 py-0.5 text-[11px]">
                          Pending
                        </Badge>
                      )}
                    </td>
                    <td className="py-3">
                      <Badge tone="orange" className="px-2 py-0.5 text-[11px]">
                        {formatPoints(entry.points)}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </Container>
  );
}
