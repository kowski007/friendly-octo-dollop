"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import {
  Badge,
  ButtonLink,
  Card,
  Container,
  NairaTermBadge,
  SectionHeader,
} from "./ui";
import { CopyButton } from "./CopyButton";

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
      <Container>
        <SectionHeader
          eyebrow="Referrals"
          title="Invite people to claim a handle."
          description="Sign in first so we can attribute referrals to your account."
        />
        <div className="mt-10">
          <Card className="p-6 sm:p-7">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="orange">Sign in required</Badge>
              <NairaTermBadge term="handle" tone="neutral" />
            </div>
            <div className="mt-4 max-w-2xl text-base leading-7 text-zinc-600 dark:text-zinc-300">
              Complete the phone OTP or Privy sign-in flow, then come back here
              to copy your referral link.
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <ButtonLink href="/agent">Open claim flow</ButtonLink>
              <ButtonLink href="/" variant="secondary">
                Home
              </ButtonLink>
            </div>
          </Card>
        </div>
      </Container>
    );
  }

  const dashboard = data && "ok" in data && data.ok ? data : null;
  const hasUsernameReferral = Boolean(
    dashboard && !dashboard.requiresHandle && dashboard.referralUrl
  );

  return (
    <Container className="space-y-8">
      <SectionHeader
        eyebrow="Referrals"
        title="Invite people to claim a handle."
        description="Share your username link. You earn referral points when someone signs up, then a bigger bonus when they claim a handle."
      />

      {error && error !== "unauthorized" ? (
        <Card className="p-6">
          <div className="text-sm font-semibold text-rose-700 dark:text-rose-300">
            {error}
          </div>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="p-6 sm:p-7">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="neutral">Your username link</Badge>
            {isPending ? <Badge tone="orange">Loading...</Badge> : null}
            {dashboard?.requiresHandle ? (
              <Badge tone="orange">Claim handle first</Badge>
            ) : null}
          </div>

          {dashboard?.requiresHandle ? (
            <div className="mt-4 rounded-3xl bg-orange-50 px-4 py-4 text-sm font-semibold leading-6 text-orange-950 dark:bg-orange-950/25 dark:text-orange-100">
              Your referral link must be your username. Claim a handle first,
              then this page will show `/r/your_handle`.
            </div>
          ) : null}

          <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto]">
            <div className="rounded-3xl border border-zinc-200/70 bg-white/70 px-4 py-4 font-mono text-sm text-zinc-900 shadow-sm backdrop-blur dark:border-zinc-800/70 dark:bg-zinc-950/25 dark:text-zinc-50">
              {hasUsernameReferral ? dashboard?.referralUrl : "-"}
            </div>
            <div className="flex gap-2">
              <CopyButton value={hasUsernameReferral ? dashboard?.referralUrl ?? "" : ""} />
              <CopyButton value={shareText} label="Copy text" copiedLabel="Copied" />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-zinc-600 dark:text-zinc-300">
            <div>
              Username:{" "}
              <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-50">
                {hasUsernameReferral ? `${NAIRA}${dashboard?.referralCode}` : "-"}
              </span>
            </div>
            <Badge tone="orange">
              Link opens `/r/{hasUsernameReferral ? dashboard?.referralCode : "username"}`
            </Badge>
            {dashboard ? (
              <Badge tone="neutral">
                +{dashboard.signupPointsPerReferral} signup, +
                {dashboard.conversionPointsPerReferral} claimed
              </Badge>
            ) : null}
          </div>
        </Card>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
          <Card className="p-6">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
              Referral points
            </div>
            <div className="mt-3 text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
              {dashboard ? dashboard.referralPoints.toLocaleString() : "-"}
            </div>
            <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
              Points earned from signups and claimed handles.
            </div>
          </Card>

          <Card className="p-6">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
              Total referrals
            </div>
            <div className="mt-3 text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
              {dashboard ? dashboard.totalReferrals.toLocaleString() : "-"}
            </div>
            <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
              People who signed up via your link.
            </div>
          </Card>

          <Card className="p-6">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
              Converted
            </div>
            <div className="mt-3 text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
              {dashboard ? dashboard.convertedReferrals.toLocaleString() : "-"}
            </div>
            <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
              Referred users who claimed a handle.
            </div>
          </Card>

          <Card className="p-6">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
              Pending bonus
            </div>
            <div className="mt-3 text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
              {dashboard ? dashboard.pendingConversionPoints.toLocaleString() : "-"}
            </div>
            <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
              Possible points when pending referrals claim handles.
            </div>
          </Card>
        </div>
      </div>

      <Card className="p-6 sm:p-7">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
              Recent referrals
            </div>
            <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
              Latest signups attributed to your link.
            </div>
          </div>
          <button
            type="button"
            onClick={load}
            className="rounded-full border border-zinc-200/70 bg-white/70 px-4 py-2 text-sm font-semibold text-zinc-900 shadow-sm backdrop-blur transition hover:bg-white dark:border-zinc-800/70 dark:bg-zinc-950/30 dark:text-zinc-50 dark:hover:bg-zinc-950/45"
          >
            Refresh
          </button>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                <th className="py-2 pr-4">Referred</th>
                <th className="py-2 pr-4">Handle</th>
                <th className="py-2 pr-4">Signed up</th>
                <th className="py-2 pr-4">Converted</th>
                <th className="py-2 pr-4">Points</th>
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
                    <td className="py-3 pr-4">{entry.referredName || "-"}</td>
                    <td className="py-3 pr-4 font-mono text-xs">
                      {entry.referredHandle ? `${NAIRA}${entry.referredHandle}` : "-"}
                    </td>
                    <td className="py-3 pr-4 text-xs text-zinc-500 dark:text-zinc-400">
                      {formatDate(entry.createdAt)}
                    </td>
                    <td className="py-3 pr-4">
                      {entry.convertedAt ? (
                        <Badge tone="verify" className="px-2 py-0.5 text-[11px]">
                          {formatDate(entry.convertedAt)}
                        </Badge>
                      ) : (
                        <Badge tone="neutral" className="px-2 py-0.5 text-[11px]">
                          pending
                        </Badge>
                      )}
                    </td>
                    <td className="py-3 pr-4">
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
