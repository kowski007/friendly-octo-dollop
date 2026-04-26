"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useState, useTransition } from "react";

import { AuthModalButton } from "@/components/auth/AuthModalButton";
import type {
  ClaimRecord,
  NotificationPriority,
  NotificationRecord,
  UserRecord,
} from "@/lib/adminTypes";
import { AppPageHeader } from "./AppPageHeader";
import { useToast } from "./ToastProvider";
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

type NotificationFilter = "all" | "unread" | "payments" | "activity" | "account";

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

function notificationBucket(notification: NotificationRecord): Exclude<NotificationFilter, "all" | "unread"> {
  if (
    notification.type.startsWith("payment_") ||
    notification.type.startsWith("paylink_") ||
    notification.type.startsWith("settlement_") ||
    notification.type.startsWith("receipt_")
  ) {
    return "payments";
  }
  if (
    notification.type.startsWith("marketplace_") ||
    notification.type.startsWith("referral_") ||
    notification.type === "handle_sold"
  ) {
    return "activity";
  }
  if (notification.type.startsWith("telegram_")) {
    return "account";
  }
  return "account";
}

function matchesFilter(notification: NotificationRecord, filter: NotificationFilter) {
  if (filter === "all") return true;
  if (filter === "unread") return notification.status === "unread";
  return notificationBucket(notification) === filter;
}

function filterLabel(filter: NotificationFilter) {
  if (filter === "unread") return "Unread";
  if (filter === "payments") return "Payments";
  if (filter === "activity") return "Activity";
  if (filter === "account") return "Account";
  return "All";
}

function ActionLink({
  href,
  children,
  variant = "secondary",
  className,
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary";
  className?: string;
}) {
  return (
    <a
      href={href}
      className={cn(
        "inline-flex h-9 items-center justify-center rounded-xl px-3 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nt-orange/50",
        variant === "primary"
          ? "bg-nt-orange text-white hover:brightness-110"
          : "border border-zinc-300/70 bg-white/75 text-zinc-950 hover:bg-white dark:border-zinc-700/80 dark:bg-zinc-950/30 dark:text-zinc-50 dark:hover:bg-zinc-950/45",
        className
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
        "rounded-[1.7rem] border border-zinc-200/75 bg-white/90 shadow-[0_16px_42px_rgba(15,23,42,0.06)] dark:border-zinc-800/80 dark:bg-zinc-950/45 dark:shadow-[0_20px_48px_rgba(0,0,0,0.22)]",
        className
      )}
    >
      {children}
    </section>
  );
}

function SignInState() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 transition-colors dark:bg-zinc-950 dark:text-zinc-50">
      <AppPageHeader ctaHref="/claim" ctaLabel="Claim a ₦handle" />
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

function NotificationIcon({
  notification,
}: {
  notification: NotificationRecord;
}) {
  const bucket = notificationBucket(notification);
  const accent =
    bucket === "payments"
      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200"
      : bucket === "activity"
        ? "bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-200"
        : "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-200";

  return (
    <div className={cn("relative grid h-11 w-11 shrink-0 place-items-center rounded-2xl", accent)}>
      <svg viewBox="0 0 24 24" fill="none" className="h-4.5 w-4.5" aria-hidden="true">
        {bucket === "payments" ? (
          <path
            d="M4 8.5h16M6 5h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm10 8h2"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : bucket === "activity" ? (
          <path
            d="M8 12h8M8 16h5M7 4h10a2 2 0 0 1 2 2v12l-4-2-4 2-4-2-4 2V6a2 2 0 0 1 2-2h2Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : (
          <path
            d="M12 8h.01M12 12v4m8-4a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>
      {notification.status === "unread" ? (
        <span className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full bg-nt-orange ring-2 ring-white dark:ring-zinc-950" />
      ) : null}
    </div>
  );
}

function NotificationTab({
  active,
  count,
  label,
  onClick,
}: {
  active: boolean;
  count: number;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-7 shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2 text-[11px] font-semibold transition sm:h-10 sm:gap-2 sm:px-3 sm:text-sm",
        active
          ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
          : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-white"
      )}
    >
      <span className="whitespace-nowrap">{label}</span>
      <span
        className={cn(
          "inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-semibold leading-none sm:h-auto sm:min-w-0 sm:px-1.5 sm:py-0.5 sm:text-[10px]",
          active
            ? "bg-white/15 text-white dark:bg-zinc-100 dark:text-zinc-950"
            : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-200"
        )}
      >
        {count}
      </span>
    </button>
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
        "grid gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center",
        isUnread ? "bg-orange-50/35 dark:bg-orange-950/10" : "bg-transparent"
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <NotificationIcon notification={notification} />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <h2 className="min-w-0 truncate text-sm font-semibold text-zinc-950 dark:text-zinc-50">
              {notification.title}
            </h2>
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
            <span>{filterLabel(notificationBucket(notification))}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:justify-end">
        {isUnread ? (
          <button
            type="button"
            onClick={() => onMarkRead(notification.id)}
            disabled={isPending}
            className="h-9 rounded-xl border border-zinc-300/70 bg-white/80 px-3 text-xs font-semibold text-zinc-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700/80 dark:bg-zinc-950/30 dark:text-zinc-50"
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
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [activeFilter, setActiveFilter] = useState<NotificationFilter>("all");

  if (!data) return <SignInState />;

  const { notifications } = data;
  const filteredItems = notifications.items.filter((notification) =>
    matchesFilter(notification, activeFilter)
  );
  const filteredUnread = filteredItems.filter(
    (notification) => notification.status === "unread"
  ).length;
  const counts: Record<NotificationFilter, number> = {
    all: notifications.items.length,
    unread: notifications.items.filter((notification) => notification.status === "unread").length,
    payments: notifications.items.filter(
      (notification) => notificationBucket(notification) === "payments"
    ).length,
    activity: notifications.items.filter(
      (notification) => notificationBucket(notification) === "activity"
    ).length,
    account: notifications.items.filter(
      (notification) => notificationBucket(notification) === "account"
    ).length,
  };

  function markRead(ids?: string[]) {
    startTransition(async () => {
      try {
        const response = await fetch("/api/notifications/me", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-store",
          },
          body: JSON.stringify(ids ? { ids } : {}),
        });
        if (!response.ok) {
          throw new Error("notification_update_failed");
        }

        toast({
          title: ids ? "Notification updated" : "Notifications updated",
          description: ids
            ? "That item is now marked as read."
            : "Your inbox has been cleared.",
          tone: "success",
        });
        router.refresh();
      } catch {
        toast({
          title: "Update failed",
          description: "We couldn't update your notifications right now.",
          tone: "error",
        });
      }
    });
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 transition-colors dark:bg-zinc-950 dark:text-zinc-50">
      <AppPageHeader ctaHref="/dashboard" ctaLabel="Dashboard" />
      <main className="py-5 sm:py-6">
        <Container className="max-w-5xl space-y-4">
          <Panel className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200/70 px-3 py-3 dark:border-zinc-800/80 sm:gap-3 sm:px-4 sm:py-4">
              <div>
                <div className="text-base font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-lg">
                  Inbox
                </div>
                <div className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400 sm:mt-1 sm:text-xs">
                  {filteredItems.length} item(s) in {filterLabel(activeFilter).toLowerCase()}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <ActionLink
                  href="/settings#notifications"
                  className="h-8 rounded-lg px-2.5 text-[11px] sm:h-9 sm:rounded-xl sm:px-3 sm:text-xs"
                >
                  Manage settings
                </ActionLink>
                <button
                  type="button"
                  onClick={() => markRead()}
                  disabled={isPending || notifications.unread === 0}
                  className="h-8 rounded-lg bg-nt-orange px-2.5 text-[11px] font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-55 sm:h-9 sm:rounded-xl sm:px-3 sm:text-xs"
                >
                  {isPending ? "Updating" : "Mark all as read"}
                </button>
                {filteredUnread > 0 ? (
                  <button
                    type="button"
                    onClick={() =>
                      markRead(
                        filteredItems
                          .filter((notification) => notification.status === "unread")
                          .map((notification) => notification.id)
                      )
                    }
                    disabled={isPending}
                    className="hidden h-9 rounded-xl border border-zinc-300/70 bg-white/80 px-3 text-xs font-semibold text-zinc-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-55 dark:border-zinc-700/80 dark:bg-zinc-950/30 dark:text-zinc-50 sm:inline-flex"
                  >
                    Mark visible as read
                  </button>
                ) : null}
              </div>
            </div>

            <div className="overflow-x-auto border-b border-zinc-200/70 px-2 py-1.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden dark:border-zinc-800/80 sm:px-3 sm:py-3">
              <div className="flex min-w-max gap-1 sm:gap-2">
                {(
                  ["all", "unread", "payments", "activity", "account"] as NotificationFilter[]
                ).map((filter) => (
                  <NotificationTab
                    key={filter}
                    active={activeFilter === filter}
                    count={counts[filter]}
                    label={filterLabel(filter)}
                    onClick={() => setActiveFilter(filter)}
                  />
                ))}
              </div>
            </div>

            {filteredItems.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                  Nothing here yet
                </div>
                <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
                  Try another tab or come back after new account activity.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-200/70 dark:divide-zinc-800/80">
                {filteredItems.map((notification) => (
                  <NotificationRow
                    key={notification.id}
                    notification={notification}
                    onMarkRead={(id) => markRead([id])}
                    isPending={isPending}
                  />
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-200/70 px-4 py-3 text-[11px] text-zinc-500 dark:border-zinc-800/80 dark:text-zinc-400">
              <span>
                Use filters to focus on payments, activity, or account alerts.
              </span>
              <a
                href="/settings#notifications"
                className="font-semibold text-zinc-700 transition hover:text-zinc-950 dark:text-zinc-200 dark:hover:text-white"
              >
                Manage notifications
              </a>
            </div>
          </Panel>
        </Container>
      </main>
    </div>
  );
}
