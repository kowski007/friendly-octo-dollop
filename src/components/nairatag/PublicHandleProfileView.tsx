import type { ReactNode } from "react";
import Link from "next/link";

import type {
  CreditRiskBand,
  PublicHandleProfile,
  PublicHandleSuggestion,
} from "@/lib/adminTypes";

import { AppPageHeader } from "./AppPageHeader";
import { CopyButton } from "./CopyButton";
import { HandleIdentity } from "./HandleTrust";
import { Badge, ButtonLink, Card, CheckIcon, Container, cn } from "./ui";

const NAIRA = "\u20A6";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    notation: amount >= 1_000_000 ? "compact" : "standard",
    maximumFractionDigits: amount >= 1_000_000 ? 1 : 0,
  }).format(amount);
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  });
}

function trustTone(score: number) {
  if (score >= 75) return "verify";
  if (score >= 50) return "orange";
  return "neutral";
}

function riskTone(riskLevel: CreditRiskBand | "unknown") {
  if (riskLevel === "low") return "verify";
  if (riskLevel === "medium") return "orange";
  return "neutral";
}

function sanitizeDisplayName(profile: PublicHandleProfile) {
  const value = profile.displayName.trim();
  if (!value || /^pending verification$/i.test(value)) {
    return null;
  }
  return value;
}

function profileInitials(profile: PublicHandleProfile) {
  const name = sanitizeDisplayName(profile);
  return (
    name
      ?.split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || profile.handle.slice(0, 2).toUpperCase()
  );
}

function qrBits(seed: string) {
  const bits: boolean[] = [];
  let state = 0;
  for (const char of seed) {
    state = (state * 33 + char.charCodeAt(0)) % 2147483647;
  }
  for (let index = 0; index < 18 * 18; index += 1) {
    state = (state * 1103515245 + 12345) % 2147483647;
    bits.push(state % 5 !== 0);
  }
  return bits;
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={cn("h-4 w-4", className)}
      aria-hidden="true"
    >
      <path
        d="M12 3l7 3v5c0 4.5-2.6 7.8-7 10-4.4-2.2-7-5.5-7-10V6l7-3z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BankIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={cn("h-4 w-4", className)}
      aria-hidden="true"
    >
      <path
        d="M4 10h16M6 10V19M10 10V19M14 10V19M18 10V19M3 19h18M4 10l8-5 8 5"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ActivityIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={cn("h-4 w-4", className)}
      aria-hidden="true"
    >
      <path
        d="M4 13h4l2.2-5 3.6 9 2.2-5H20"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={cn("h-4 w-4", className)}
      aria-hidden="true"
    >
      <path
        d="M7 10V8a5 5 0 0110 0v2M6 10h12v10H6V10z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function QrPreview({ value }: { value: string }) {
  const bits = qrBits(value);

  return (
    <div className="rounded-[1.5rem] border border-zinc-200/75 bg-white p-3.5 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-950">
      <div className="mx-auto grid max-w-[148px] grid-cols-[repeat(18,minmax(0,1fr))] gap-[2px] rounded-[1rem] bg-zinc-100 p-3 dark:bg-zinc-900">
        {bits.map((on, index) => (
          <div
            key={index}
            className={cn(
              "aspect-square rounded-[2px]",
              on ? "bg-zinc-950 dark:bg-zinc-50" : "bg-transparent"
            )}
          />
        ))}
      </div>
      <div className="mt-3 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
        Scan to pay
      </div>
    </div>
  );
}

function MetaChip({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-[1.2rem] border border-zinc-200/70 bg-zinc-50/90 px-3.5 py-3 dark:border-zinc-800/80 dark:bg-zinc-900/45">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-zinc-700 shadow-sm dark:bg-zinc-950 dark:text-zinc-200">
        {icon}
      </span>
      <div className="min-w-0">
        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
          {label}
        </div>
        <div className="truncate text-sm font-semibold text-zinc-950 dark:text-zinc-50">
          {value}
        </div>
      </div>
    </div>
  );
}

function VerificationRow({
  icon,
  label,
  status,
  done,
}: {
  icon: ReactNode;
  label: string;
  status: string;
  done: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[1.15rem] border border-zinc-200/70 bg-zinc-50/85 px-3.5 py-3 dark:border-zinc-800/80 dark:bg-zinc-900/40">
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={cn(
            "grid h-8 w-8 shrink-0 place-items-center rounded-full border",
            done
              ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/35 dark:text-emerald-200"
              : "border-zinc-200 bg-white text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400"
          )}
        >
          {icon}
        </span>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
            {label}
          </div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400">{status}</div>
        </div>
      </div>
      <Badge tone={done ? "verify" : "neutral"}>{done ? "Done" : "Pending"}</Badge>
    </div>
  );
}

function NearbyHandleRow({ item }: { item: PublicHandleSuggestion }) {
  return (
    <div className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <HandleIdentity handle={item.handle} verification={item.verification} size="sm" />
        <div className="mt-2 flex flex-wrap gap-2">
          <Badge tone={trustTone(item.trustScore)}>Trust {item.trustScore}</Badge>
          {item.isListed ? <Badge tone="orange">Listed</Badge> : null}
          {item.askAmount != null ? <Badge>{formatCurrency(item.askAmount)}</Badge> : null}
        </div>
      </div>
      <Link
        href={`/h/${item.handle}`}
        className="inline-flex h-9 shrink-0 items-center justify-center rounded-xl border border-zinc-200/80 px-3.5 text-xs font-semibold text-zinc-950 transition hover:bg-zinc-50 dark:border-zinc-800/80 dark:text-zinc-50 dark:hover:bg-zinc-900"
      >
        View
      </Link>
    </div>
  );
}

export function PublicHandleProfileView({
  profile,
  suggestions,
}: {
  profile: PublicHandleProfile | null;
  suggestions: PublicHandleSuggestion[];
}) {
  if (!profile) {
    return (
      <div className="min-h-screen bg-white text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
        <AppPageHeader ctaHref="/claim" ctaLabel={`Claim a ${NAIRA}handle`} />
        <main className="py-14 sm:py-18">
          <Container>
            <Card className="p-6 sm:p-8">
              <div className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                Profile not found
              </div>
              <p className="mt-3 max-w-2xl text-base leading-7 text-zinc-600 dark:text-zinc-300">
                This handle does not have a public profile yet.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <ButtonLink href="/claim">{`Claim a ${NAIRA}handle`}</ButtonLink>
                <ButtonLink href="/" variant="secondary">
                  Back home
                </ButtonLink>
              </div>
            </Card>
          </Container>
        </main>
      </div>
    );
  }

  const displayName = sanitizeDisplayName(profile);
  const trimmedSuggestions = suggestions
    .filter((item) => item.handle !== profile.handle)
    .slice(0, 3);
  const payoutValue = profile.bank.accountVerified
    ? profile.bank.name
    : "Payout pending";
  const activityValue =
    profile.publicStats.recentTransactionCount30d > 0
      ? `${profile.publicStats.recentTransactionCount30d} recent`
      : "No recent activity";
  const volumeValue =
    profile.publicStats.totalVolume > 0
      ? formatCurrency(profile.publicStats.totalVolume)
      : `${NAIRA}0`;

  return (
    <div className="min-h-screen bg-white text-zinc-950 transition-colors dark:bg-zinc-950 dark:text-zinc-50">
      <AppPageHeader ctaHref={profile.payUrl} ctaLabel="Send money" />

      <main className="py-10 sm:py-14">
        <Container className="max-w-5xl space-y-5">
          <Card className="p-5 sm:p-7">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-start">
              <div className="min-w-0">
                <div className="flex items-start gap-4">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-zinc-950 text-white shadow-sm dark:bg-white dark:text-zinc-950">
                    {profile.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={profile.avatarUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-base font-semibold">
                        {profileInitials(profile)}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <HandleIdentity
                      handle={profile.handle}
                      verification={profile.verification.status}
                      size="lg"
                    />
                    {displayName ? (
                      <div className="mt-3 text-xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-2xl">
                        {displayName}
                      </div>
                    ) : null}
                    <div className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                      Verify the recipient, then pay with confidence.
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge tone={trustTone(profile.reputation.trustScore)}>
                    Trust {profile.reputation.trustScore}/100
                  </Badge>
                  <Badge tone={riskTone(profile.reputation.riskLevel)}>
                    {profile.reputation.riskLevel === "unknown"
                      ? "Risk pending"
                      : `${profile.reputation.riskLevel} risk`}
                  </Badge>
                  <Badge>{`Since ${formatDate(profile.memberSince)}`}</Badge>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <ButtonLink href={profile.payUrl}>Send money</ButtonLink>
                  <CopyButton
                    value={profile.shareUrl}
                    label="Copy public link"
                    copiedLabel="Link copied"
                  />
                </div>

                <div className="mt-5 inline-flex max-w-2xl items-center gap-2 rounded-full border border-zinc-200/75 bg-zinc-50/90 px-3.5 py-2 text-xs font-medium text-zinc-600 dark:border-zinc-800/80 dark:bg-zinc-900/40 dark:text-zinc-300">
                  <LockIcon className="text-zinc-500 dark:text-zinc-400" />
                  Phone, BVN, account number, and raw transaction history stay private.
                </div>
              </div>

              <div className="space-y-3">
                <QrPreview value={profile.qrPayload} />
                <MetaChip
                  icon={<BankIcon className="text-zinc-700 dark:text-zinc-200" />}
                  label="Payout"
                  value={payoutValue}
                />
                <MetaChip
                  icon={<ActivityIcon className="text-zinc-700 dark:text-zinc-200" />}
                  label="Activity"
                  value={activityValue}
                />
                <MetaChip
                  icon={<ShieldIcon className="text-zinc-700 dark:text-zinc-200" />}
                  label="Volume"
                  value={volumeValue}
                />
              </div>
            </div>
          </Card>

          <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
            <Card className="p-5 sm:p-6">
              <div className="flex items-center gap-2 text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                <ShieldIcon className="text-emerald-600 dark:text-emerald-300" />
                Checks
              </div>
              <div className="mt-4 space-y-3">
                <VerificationRow
                  icon={<CheckIcon className="h-3.5 w-3.5" />}
                  label="Phone"
                  status="Verified session behind this handle"
                  done={profile.verification.phoneVerified}
                />
                <VerificationRow
                  icon={<ShieldIcon className="h-3.5 w-3.5" />}
                  label="Handle claim"
                  status={`${NAIRA}${profile.handle} belongs to one owner`}
                  done
                />
                <VerificationRow
                  icon={<CheckIcon className="h-3.5 w-3.5" />}
                  label="BVN"
                  status={
                    profile.verification.bvnVerified
                      ? "Identity checks completed"
                      : "Identity check still pending"
                  }
                  done={profile.verification.bvnVerified}
                />
                <VerificationRow
                  icon={<BankIcon className="h-3.5 w-3.5" />}
                  label="Payout"
                  status={
                    profile.bank.accountVerified
                      ? `${profile.bank.name} is payout ready`
                      : `${profile.bank.name} not verified yet`
                  }
                  done={profile.bank.accountVerified}
                />
              </div>
            </Card>

            <Card className="p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                  <ActivityIcon className="text-emerald-600 dark:text-emerald-300" />
                  Nearby handles
                </div>
                {trimmedSuggestions.length > 0 ? <Badge>{trimmedSuggestions.length}</Badge> : null}
              </div>

              {trimmedSuggestions.length === 0 ? (
                <div className="mt-4 rounded-[1.15rem] border border-zinc-200/75 bg-zinc-50/85 px-4 py-4 text-sm text-zinc-600 dark:border-zinc-800/80 dark:bg-zinc-900/35 dark:text-zinc-300">
                  No nearby handles to show right now.
                </div>
              ) : (
                <div className="mt-4 divide-y divide-zinc-200/70 dark:divide-zinc-800/80">
                  {trimmedSuggestions.map((item) => (
                    <NearbyHandleRow key={item.handle} item={item} />
                  ))}
                </div>
              )}
            </Card>
          </div>
        </Container>
      </main>
    </div>
  );
}
