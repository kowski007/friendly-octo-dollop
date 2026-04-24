"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useTransition } from "react";

import { AuthModalButton } from "@/components/auth/AuthModalButton";
import type {
  ClaimRecord,
  NotificationPriority,
  NotificationRecord,
  UserRecord,
} from "@/lib/adminTypes";
import { AppPageHeader } from "./AppPageHeader";
import { Badge, Container, cn } from "./ui";

const NAIRA = "\u20A6";

type NotificationSummary = {
  total: number;
  unread: number;
  items: NotificationRecord[];
};

export type UserNotificationsData = {
  user: UserRecord;
  claim: ClaimRecord | null;
  notifications: NotificationSummary;
};

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

function priorityTone(priority: NotificationPriority) {
  if (priority === "high") return "orange";
  if (priority === "normal") return "verify";
  return "neutral";
}

function ActionLink({
  href,
  children,
  variant = "secondary",
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary";
}) {
  return (
    <a
      href={href}
      className={cn(
        "inline-flex h-9 items-center justify-center rounded-xl px-3 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nt-orange/50",
        variant === "primary"
          ? "bg-nt-orange text-white hover:brightness-110"
          : "border border-zinc-300/70 bg-white/75 text-zinc-950 hover:bg-white dark:border-zinc-700/80 dark:bg-zinc-950/30 dark:text-zinc-50 dark:hover:bg-zinc-950/45"
      )}
    >
      {children}
    </a>
  );
}

function Panel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-zinc-200/75 bg-white/85 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-950/35",
        className
      )}
    >
      {children}
    </section>
  );
}

function SummaryTile({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200/70 bg-white/80 p-3 dark:border-zinc-800/80 dark:bg-zinc-950/35">
      <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-500 dark:text-zinc-400">
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
        {value}
      </div>
      <div className="mt-0.5 truncate text-xs text-zinc-600 dark:text-zinc-300">
        {detail}
      </div>
    </div>
  );
}

function SignInState() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 transition-colors dark:bg-zinc-950 dark:text-zinc-50">
      <AppPageHeader ctaHref="/agent" ctaLabel="Claim a handle" />
      <main className="py-6 sm:py-8">
        <Container className="max-w-3xl">
          <Panel className="p-4 sm:p-5">
            <Badge tone="orange" className="px-2 py-0.5 text-[11px]">
              Sign in required
            </Badge>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
              Open your notifications.
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-600 dark:text-zinc-300">
              Sign in to view account, payment, referral, and marketplace updates.
            </p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <AuthModalButton afterAuthHref="/notifications" variant="primary">
                Sign in
              </AuthModalButton>
              <ActionLink href="/dashboard">Dashboard</ActionLink>
            </div>
          </Panel>
        </Container>
      </main>
    </div>
  );
}

function NotificationRow({
  notification,
  onMarkRead,
  isPending,
}: {
  notification: NotificationRecord;
  onMarkRead: (id: string) => void;
  isPending: boolean;
}) {
  const isUnread = notification.status === "unread";

  return (
    <article
      className={cn(
        "grid gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_8.5rem] sm:items-start",
        isUnread ? "bg-orange-50/45 dark:bg-orange-950/15" : "bg-transparent"
      )}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <h2 className="min-w-0 truncate text-sm font-semibold text-zinc-950 dark:text-zinc-50">
            {notification.title}
          </h2>
          <Badge
            tone={isUnread ? "orange" : "neutral"}
            className="shrink-0 px-2 py-0.5 text-[10px]"
          >
            {notification.status}
          </Badge>
          <Badge
            tone={priorityTone(notification.priority)}
            className="shrink-0 px-2 py-0.5 text-[10px]"
          >
            {notification.priority}
          </Badge>
        </div>
        <p className="mt-1 text-xs leading-5 text-zinc-600 dark:text-zinc-300">
          {notification.body}
        </p>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-zinc-500 dark:text-zinc-400">
          <span>{formatDateTime(notification.createdAt)}</span>
          {notification.handle ? <span>{NAIRA}{notification.handle}</span> : null}
          {notification.type ? <span>{notification.type.replaceAll("_", " ")}</span> : null}
        </div>
      </div>

      <div className="flex justify-start sm:justify-end">
        {isUnread ? (
          <button
            type="button"
            onClick={() => onMarkRead(notification.id)}
            disabled={isPending}
            className="h-8 rounded-lg border border-zinc-300/70 bg-white/75 px-2.5 text-[11px] font-semibold text-zinc-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700/80 dark:bg-zinc-950/30 dark:text-zinc-50"
          >
            {isPending ? "Updating" : "Mark read"}
          </button>
        ) : (
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
            Read {formatDateTime(notification.readAt)}
          </span>
        )}
      </div>
    </article>
  );
}

export function UserNotificationsView({
  data,
}: {
  data: UserNotificationsData | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (!data) return <SignInState />;

  const { user, claim, notifications } = data;
  const highPriority = notifications.items.filter(
    (notification) => notification.priority === "high"
  ).length;
  const accountLabel = claim ? `${NAIRA}${claim.handle}` : user.phone;

  function markRead(ids?: string[]) {
    startTransition(async () => {
      await fetch("/api/notifications/me", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
        body: JSON.stringify(ids ? { ids } : {}),
      });
      router.refresh();
    });
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 transition-colors dark:bg-zinc-950 dark:text-zinc-50">
      <AppPageHeader ctaHref="/dashboard" ctaLabel="Dashboard" />
      <main className="py-5 sm:py-6">
        <Container className="max-w-5xl space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <Badge tone="neutral" className="px-2 py-0.5 text-[11px]">
                {accountLabel}
              </Badge>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                Notifications
              </h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <ActionLink href="/dashboard">Dashboard</ActionLink>
              <button
                type="button"
                onClick={() => markRead()}
                disabled={isPending || notifications.unread === 0}
                className="h-9 rounded-xl bg-nt-orange px-3 text-xs font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-55"
              >
                {isPending ? "Updating" : "Read all"}
              </button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <SummaryTile
              label="Unread"
              value={notifications.unread.toLocaleString()}
              detail="Needs attention"
            />
            <SummaryTile
              label="Total"
              value={notifications.total.toLocaleString()}
              detail="Stored updates"
            />
            <SummaryTile
              label="Priority"
              value={highPriority.toLocaleString()}
              detail="High priority"
            />
          </div>

          <Panel className="overflow-hidden">
            {notifications.items.length === 0 ? (
              <div className="p-4 text-sm text-zinc-600 dark:text-zinc-300">
                You&apos;re all caught up.
              </div>
            ) : (
              <div className="divide-y divide-zinc-200/70 dark:divide-zinc-800/80">
                {notifications.items.map((notification) => (
                  <NotificationRow
                    key={notification.id}
                    notification={notification}
                    onMarkRead={(id) => markRead([id])}
                    isPending={isPending}
                  />
                ))}
              </div>
            )}
          </Panel>
        </Container>
      </main>
    </div>
  );
}
