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
import { PaylinkQrCard } from "./PaylinkQrCard";
import { Badge, ButtonLink, Card, Container, cn } from "./ui";

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

function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={cn("h-4 w-4", className)}
      aria-hidden="true"
    >
      <path
        d="m20.5 4.6-2.8 13.1c-.2.9-.8 1.1-1.6.7l-4.2-3.1-2 1.9c-.2.2-.4.4-.8.4l.3-4.4 8-7.2c.4-.3-.1-.5-.5-.2l-9.9 6.2-4.2-1.3c-.9-.3-.9-.9.2-1.3l16.4-6.3c.8-.3 1.4.2 1.1 1.5Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SummaryStat({
  icon,
  label,
  value,
  tone = "neutral",
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tone?: "neutral" | "verify" | "orange";
}) {
  return (
    <div className="rounded-[1.1rem] border border-zinc-200/70 bg-zinc-50/85 px-3.5 py-3 dark:border-zinc-800/80 dark:bg-zinc-900/40">
      <div className="flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-white text-zinc-700 shadow-sm dark:bg-zinc-950 dark:text-zinc-200">
          {icon}
        </span>
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
          {label}
        </div>
      </div>
      <div
        className={cn(
          "mt-2 text-sm font-semibold",
          tone === "verify"
            ? "text-emerald-700 dark:text-emerald-300"
            : tone === "orange"
              ? "text-orange-700 dark:text-orange-300"
              : "text-zinc-950 dark:text-zinc-50"
        )}
      >
        {value}
      </div>
    </div>
  );
}

function CheckPill({
  icon,
  label,
  done,
}: {
  icon: ReactNode;
  label: string;
  done: boolean;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-[1.05rem] border border-zinc-200/70 bg-zinc-50/85 px-3.5 py-3 dark:border-zinc-800/80 dark:bg-zinc-900/40">
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
        <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">{label}</div>
        <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
          {done ? "Done" : "Pending"}
        </div>
      </div>
    </div>
  );
}

function SocialChip({
  username,
  url,
}: {
  username: string;
  url: string;
}) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2 rounded-full border border-sky-200/80 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-800 transition hover:bg-sky-100 dark:border-sky-900/60 dark:bg-sky-950/20 dark:text-sky-200 dark:hover:bg-sky-950/35"
    >
      <TelegramIcon className="text-sky-600 dark:text-sky-300" />
      {username}
    </a>
  );
}

function NearbyHandleRow({ item }: { item: PublicHandleSuggestion }) {
  return (
    <div className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <HandleIdentity handle={item.handle} verification={item.verification} size="sm" />
        <div className="mt-1.5 flex flex-wrap gap-2">
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
  const payoutValue = profile.bank.accountVerified ? profile.bank.name : "Payout pending";
  const activityValue =
    profile.publicStats.recentTransactionCount30d > 0
      ? `${profile.publicStats.recentTransactionCount30d} recent`
      : "No recent activity";
  const volumeValue =
    profile.publicStats.totalVolume > 0
      ? formatCurrency(profile.publicStats.totalVolume)
      : `${NAIRA}0`;
  const verificationValue =
    profile.verification.status === "business"
      ? "Business verified"
      : profile.verification.status === "verified"
        ? "Verified"
        : "Claimed";

  return (
    <div className="min-h-screen bg-white text-zinc-950 transition-colors dark:bg-zinc-950 dark:text-zinc-50">
      <AppPageHeader ctaHref={profile.payUrl} ctaLabel="Send money" />

      <main className="py-8 sm:py-12">
        <Container className="max-w-4xl space-y-4">
          <Card className="p-5 sm:p-6">
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_168px] lg:items-start">
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
                      <div className="mt-2 text-lg font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-xl">
                        {displayName}
                      </div>
                    ) : null}
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

                {profile.socials.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {profile.socials.map((social) => (
                      <SocialChip
                        key={`${social.platform}:${social.username}`}
                        username={social.username}
                        url={social.url}
                      />
                    ))}
                  </div>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-3">
                  <ButtonLink href={profile.payUrl}>Send money</ButtonLink>
                  <CopyButton
                    value={profile.shareUrl}
                    label="Copy public link"
                    copiedLabel="Link copied"
                  />
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <SummaryStat
                    icon={<ShieldIcon className="h-4 w-4 text-zinc-700 dark:text-zinc-200" />}
                    label="Verification"
                    value={verificationValue}
                    tone={profile.verification.status === "pending" ? "orange" : "verify"}
                  />
                  <SummaryStat
                    icon={<BankIcon className="h-4 w-4 text-zinc-700 dark:text-zinc-200" />}
                    label="Payout"
                    value={payoutValue}
                    tone={profile.bank.accountVerified ? "verify" : "orange"}
                  />
                  <SummaryStat
                    icon={<ActivityIcon className="h-4 w-4 text-zinc-700 dark:text-zinc-200" />}
                    label="Activity"
                    value={activityValue}
                  />
                  <SummaryStat
                    icon={<ShieldIcon className="h-4 w-4 text-zinc-700 dark:text-zinc-200" />}
                    label="Volume"
                    value={volumeValue}
                  />
                </div>

                <div className="mt-5">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
                    Checks
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <CheckPill
                      icon={<ShieldIcon className="h-3.5 w-3.5" />}
                      label="Phone"
                      done={profile.verification.phoneVerified}
                    />
                    <CheckPill
                      icon={<ShieldIcon className="h-3.5 w-3.5" />}
                      label="Handle claim"
                      done
                    />
                    <CheckPill
                      icon={<ShieldIcon className="h-3.5 w-3.5" />}
                      label="BVN"
                      done={profile.verification.bvnVerified}
                    />
                    <CheckPill
                      icon={<BankIcon className="h-3.5 w-3.5" />}
                      label="Payout"
                      done={profile.bank.accountVerified}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <PaylinkQrCard
                  value={profile.qrPayload}
                  title={`Pay ${NAIRA}${profile.handle}`}
                  subtitle="Scan to open this handle's pay page."
                  compact
                  showDownloads={false}
                />
              </div>
            </div>
          </Card>

          {trimmedSuggestions.length > 0 ? (
            <Card className="p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                  Nearby handles
                </div>
                <Badge>{trimmedSuggestions.length}</Badge>
              </div>
              <div className="mt-4 divide-y divide-zinc-200/70 dark:divide-zinc-800/80">
                {trimmedSuggestions.map((item) => (
                  <NearbyHandleRow key={item.handle} item={item} />
                ))}
              </div>
            </Card>
          ) : null}
        </Container>
      </main>
    </div>
  );
}
