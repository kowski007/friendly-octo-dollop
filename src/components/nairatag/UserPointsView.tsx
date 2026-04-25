import { AuthModalButton } from "@/components/auth/AuthModalButton";
import type {
  ClaimRecord,
  NotificationPriority,
  NotificationStatus,
  NotificationType,
  UserRecord,
} from "@/lib/adminTypes";

import { AppPageHeader } from "./AppPageHeader";
import { Badge, ButtonLink, Container, cn } from "./ui";

const NAIRA = "\u20A6";

export type UserPointsData = {
  user: UserRecord;
  claim: ClaimRecord | null;
  balance: number;
  totalEarned: number;
  welcomePoints: number;
  referralPoints: number;
  entries: Array<{
    id: string;
    type: NotificationType;
    title: string;
    body: string;
    createdAt: string;
    handle: string | null;
    points: number;
    totalPoints?: number;
    priority: NotificationPriority;
    status: NotificationStatus;
  }>;
} | null;

function formatDateTime(value?: string | null) {
  if (!value) return "Not set";
  return new Date(value).toLocaleString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function actionLinkClassName(variant: "primary" | "secondary" = "secondary") {
  return cn(
    "inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold transition",
    variant === "primary"
      ? "bg-nt-orange text-white hover:brightness-110"
      : "border border-zinc-300/70 bg-white/75 text-zinc-950 hover:bg-white dark:border-zinc-700/80 dark:bg-zinc-950/30 dark:text-zinc-50 dark:hover:bg-zinc-950/45"
  );
}

function Panel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-[1.7rem] border border-zinc-200/75 bg-white/90 shadow-[0_16px_42px_rgba(15,23,42,0.06)] dark:border-zinc-800/80 dark:bg-zinc-950/45 dark:shadow-[0_20px_48px_rgba(0,0,0,0.22)]",
        className
      )}
    >
      {children}
    </section>
  );
}

function SummaryCard({
  label,
  value,
  detail,
  tone = "neutral",
}: {
  label: string;
  value: string;
  detail: string;
  tone?: "neutral" | "verify" | "orange";
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-4",
        tone === "verify"
          ? "border-emerald-200/70 bg-emerald-50/80 dark:border-emerald-900/60 dark:bg-emerald-950/20"
          : tone === "orange"
            ? "border-orange-200/70 bg-orange-50/80 dark:border-orange-900/60 dark:bg-orange-950/20"
            : "border-zinc-200/70 bg-white/80 dark:border-zinc-800/80 dark:bg-zinc-950/35"
      )}
    >
      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
        {value}
      </div>
      <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">{detail}</div>
    </div>
  );
}

function sourceLabel(type: NotificationType) {
  if (type === "welcome_reward") return "Welcome";
  if (type === "referral_signup") return "Referral signup";
  if (type === "referral_converted") return "Referral conversion";
  if (type === "referral_points_awarded") return "Referral reward";
  return "Bonus";
}

function sourceTone(type: NotificationType) {
  if (type === "welcome_reward") return "orange" as const;
  if (
    type === "referral_signup" ||
    type === "referral_converted" ||
    type === "referral_points_awarded"
  ) {
    return "verify" as const;
  }
  return "neutral" as const;
}

function PointsRow({
  entry,
}: {
  entry: NonNullable<UserPointsData>["entries"][number];
}) {
  return (
    <article className="grid gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
            {entry.title}
          </h2>
          <Badge tone={sourceTone(entry.type)} className="px-2 py-0.5 text-[10px]">
            {sourceLabel(entry.type)}
          </Badge>
          {entry.status === "unread" ? (
            <Badge tone="orange" className="px-2 py-0.5 text-[10px]">
              New
            </Badge>
          ) : null}
        </div>
        <p className="mt-1 text-xs leading-5 text-zinc-600 dark:text-zinc-300">
          {entry.body}
        </p>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-zinc-500 dark:text-zinc-400">
          <span>{formatDateTime(entry.createdAt)}</span>
          {entry.handle ? <span>{NAIRA}{entry.handle}</span> : null}
          {typeof entry.totalPoints === "number" ? (
            <span>{entry.totalPoints.toLocaleString()} total</span>
          ) : null}
        </div>
      </div>

      <div className="flex items-center sm:justify-end">
        <div
          className={cn(
            "inline-flex h-11 min-w-[88px] items-center justify-center rounded-2xl px-4 text-sm font-semibold",
            entry.points > 0
              ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200"
              : "bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
          )}
        >
          {entry.points > 0 ? "+" : ""}
          {entry.points.toLocaleString()} pts
        </div>
      </div>
    </article>
  );
}

function SignInState() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 transition-colors dark:bg-zinc-950 dark:text-zinc-50">
      <AppPageHeader ctaHref="/claim" ctaLabel="Claim a ₦handle" />
      <main className="py-6 sm:py-8">
        <Container className="max-w-3xl">
          <Panel className="p-5">
            <Badge tone="orange" className="px-2 py-0.5 text-[11px]">
              Sign in required
            </Badge>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
              Open your points ledger.
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-600 dark:text-zinc-300">
              Sign in to track your welcome reward, referral bonuses, and every
              future points campaign in one place.
            </p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <AuthModalButton afterAuthHref="/points" variant="primary">
                Sign in
              </AuthModalButton>
              <ButtonLink href="/claim" variant="secondary">
                Claim your name
              </ButtonLink>
            </div>
          </Panel>
        </Container>
      </main>
    </div>
  );
}

export function UserPointsView({ data }: { data: UserPointsData }) {
  if (!data) return <SignInState />;

  const { user, claim, balance, totalEarned, welcomePoints, referralPoints, entries } = data;
  const otherPoints = Math.max(0, totalEarned - welcomePoints - referralPoints);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 transition-colors dark:bg-zinc-950 dark:text-zinc-50">
      <AppPageHeader ctaHref="/dashboard" ctaLabel="Dashboard" />
      <main className="py-5 sm:py-6">
        <Container className="max-w-5xl space-y-4">
          <Panel className="p-4 sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <Badge tone="verify" className="px-2 py-0.5 text-[11px]">
                  {claim ? `${NAIRA}${claim.handle}` : user.phone}
                </Badge>
                <h1 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                  Points
                </h1>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                  Welcome rewards, referral bonuses, and future campaigns all
                  settle into this one running balance.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <a href="/referrals" className={actionLinkClassName()}>
                  Referral rewards
                </a>
                <a href="/notifications" className={actionLinkClassName()}>
                  Notifications
                </a>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryCard
                label="Balance"
                value={`${balance.toLocaleString()} pts`}
                detail="Current stored points"
                tone={balance > 0 ? "verify" : "neutral"}
              />
              <SummaryCard
                label="Welcome"
                value={`${welcomePoints.toLocaleString()} pts`}
                detail="Signup reward"
                tone={welcomePoints > 0 ? "orange" : "neutral"}
              />
              <SummaryCard
                label="Referrals"
                value={`${referralPoints.toLocaleString()} pts`}
                detail="Signup and claim bonuses"
                tone={referralPoints > 0 ? "verify" : "neutral"}
              />
              <SummaryCard
                label="Other"
                value={`${otherPoints.toLocaleString()} pts`}
                detail="Campaigns and future bonuses"
                tone={otherPoints > 0 ? "verify" : "neutral"}
              />
            </div>
          </Panel>

          <Panel className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200/70 px-4 py-4 dark:border-zinc-800/80">
              <div>
                <div className="text-lg font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                  Points history
                </div>
                <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  {entries.length} reward event(s), {totalEarned.toLocaleString()} pts earned
                </div>
              </div>
              <Badge tone={entries.length > 0 ? "verify" : "neutral"} className="px-2 py-0.5 text-[11px]">
                {balance.toLocaleString()} current
              </Badge>
            </div>

            {entries.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                  No points activity yet
                </div>
                <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
                  Start with a handle claim, then invite people through your
                  referral link to grow your balance.
                </p>
                <div className="mt-5 flex flex-col items-center justify-center gap-2 sm:flex-row">
                  <a href="/claim" className={actionLinkClassName("primary")}>
                    Claim your ₦handle
                  </a>
                  <a href="/referrals" className={actionLinkClassName()}>
                    Open referrals
                  </a>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-zinc-200/70 dark:divide-zinc-800/80">
                {entries.map((entry) => (
                  <PointsRow key={entry.id} entry={entry} />
                ))}
              </div>
            )}
          </Panel>
        </Container>
      </main>
    </div>
  );
}
