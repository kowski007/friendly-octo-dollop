import Link from "next/link";

import type { PublicHandleSuggestion, Verification } from "@/lib/adminTypes";

import { Badge, Card, CheckIcon, cn } from "./ui";

const NAIRA = "\u20A6";

type VerificationChecklistItem = {
  label: string;
  detail: string;
  done: boolean;
};

function trustTone(score: number) {
  if (score >= 75) return "verify";
  if (score >= 50) return "orange";
  return "neutral";
}

function formatCurrency(amount?: number | null) {
  if (amount == null) return null;
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatHandleDisplay(handle: string) {
  return handle.startsWith(NAIRA) ? handle : `${NAIRA}${handle}`;
}

function verificationMeta(verification: Verification) {
  if (verification === "business") {
    return {
      label: "Business verified",
      detail: "Business identity and payout checks are active.",
      dotClassName:
        "border-emerald-400/80 bg-emerald-500 text-white dark:border-emerald-500/70 dark:bg-emerald-500",
      badgeClassName:
        "border-emerald-300/80 bg-emerald-50 text-emerald-900 shadow-[0_0_0_1px_rgba(16,185,129,0.08)] dark:border-emerald-800/70 dark:bg-emerald-950/35 dark:text-emerald-100",
    };
  }
  if (verification === "verified") {
    return {
      label: "Verified",
      detail: "BVN and payout destination checks are complete.",
      dotClassName:
        "border-emerald-400/80 bg-emerald-500 text-white dark:border-emerald-500/70 dark:bg-emerald-500",
      badgeClassName:
        "border-emerald-300/80 bg-emerald-50 text-emerald-900 shadow-[0_0_0_1px_rgba(16,185,129,0.08)] dark:border-emerald-800/70 dark:bg-emerald-950/35 dark:text-emerald-100",
    };
  }
  return {
    label: "Claimed",
    detail: "Handle is reserved, but stronger identity checks are still pending.",
    dotClassName:
      "border-orange-200/80 bg-orange-100 text-orange-700 dark:border-orange-900/70 dark:bg-orange-950/40 dark:text-orange-200",
    badgeClassName:
      "border-orange-200/80 bg-orange-50 text-orange-900 dark:border-orange-900/70 dark:bg-orange-950/35 dark:text-orange-100",
  };
}

export function HandleVerificationBadge({
  verification,
  className,
  size = "md",
}: {
  verification: Verification;
  className?: string;
  size?: "sm" | "md";
}) {
  const meta = verificationMeta(verification);
  const sizeClass =
    size === "sm" ? "px-2.5 py-1 text-[11px]" : "px-3 py-1.5 text-xs sm:text-sm";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border font-semibold tracking-tight",
        sizeClass,
        meta.badgeClassName,
        className
      )}
      title={meta.detail}
    >
      <span
        className={cn(
          "grid h-4 w-4 place-items-center rounded-full border",
          meta.dotClassName
        )}
      >
        {verification === "pending" ? (
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
        ) : (
          <CheckIcon className="h-3 w-3" />
        )}
      </span>
      {meta.label}
    </span>
  );
}

export function HandleIdentity({
  handle,
  verification,
  className,
  size = "md",
}: {
  handle: string;
  verification: Verification;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const textClassName =
    size === "lg"
      ? "px-4 py-2 text-xl sm:text-2xl"
      : size === "sm"
        ? "px-3 py-1.5 text-sm"
        : "px-3.5 py-2 text-base";

  return (
    <div className={cn("flex flex-wrap items-center gap-2.5", className)}>
      <span
        className={cn(
          "inline-flex items-center rounded-full border border-zinc-200/75 bg-white/90 font-semibold tracking-tight text-zinc-950 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-950/45 dark:text-zinc-50",
          textClassName
        )}
      >
        {formatHandleDisplay(handle)}
      </span>
      <HandleVerificationBadge
        verification={verification}
        size={size === "sm" ? "sm" : "md"}
      />
    </div>
  );
}

export function VerificationChecklist({
  title = "Verification checklist",
  description = "See exactly what has been verified before money moves to this handle.",
  items,
  className,
}: {
  title?: string;
  description?: string;
  items: VerificationChecklistItem[];
  className?: string;
}) {
  return (
    <Card className={cn("p-6 sm:p-7", className)}>
      <div>
        <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
          {title}
        </div>
        <div className="mt-2 max-w-2xl text-sm leading-7 text-zinc-600 dark:text-zinc-300">
          {description}
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex items-start gap-3 rounded-[1.4rem] border border-zinc-200/70 bg-zinc-50/85 px-4 py-4 dark:border-zinc-800/80 dark:bg-zinc-900/40"
          >
            <span
              className={cn(
                "mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border",
                item.done
                  ? "border-emerald-300 bg-emerald-500 text-white dark:border-emerald-700/70 dark:bg-emerald-500"
                  : "border-zinc-200 bg-white text-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-600"
              )}
            >
              {item.done ? <CheckIcon className="h-3.5 w-3.5" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
            </span>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                {item.label}
              </div>
              <div className="mt-1 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                {item.detail}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function BadgeLegend({ className }: { className?: string }) {
  return (
    <Card className={cn("p-6 sm:p-7", className)}>
      <div>
        <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
          Badge legend
        </div>
        <div className="mt-2 max-w-2xl text-sm leading-7 text-zinc-600 dark:text-zinc-300">
          NairaTag badges are payment-trust signals, not celebrity marks.
        </div>
      </div>

      <div className="mt-5 grid gap-3">
        {([
          {
            verification: "pending" as const,
            title: "Claimed",
            body: "The handle is reserved, but identity or payout checks are still incomplete.",
          },
          {
            verification: "verified" as const,
            title: "Verified",
            body: "Phone, BVN, and payout routing checks are strong enough for safer payments.",
          },
          {
            verification: "business" as const,
            title: "Business verified",
            body: "This handle is operating with a business-grade identity and merchant context.",
          },
        ]).map((item) => (
          <div
            key={item.title}
            className="flex items-start gap-3 rounded-[1.4rem] border border-zinc-200/70 bg-zinc-50/85 px-4 py-4 dark:border-zinc-800/80 dark:bg-zinc-900/40"
          >
            <HandleVerificationBadge verification={item.verification} />
            <div className="min-w-0">
              <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                {item.title}
              </div>
              <div className="mt-1 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                {item.body}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function SuggestedHandlesSection({
  items,
  title = "Suggested handles",
  description = "Explore nearby handles that are already live, verified, or worth checking next.",
  emptyState = "No suggested handles are available right now.",
  mode = "profile",
  className,
}: {
  items: PublicHandleSuggestion[];
  title?: string;
  description?: string;
  emptyState?: string;
  mode?: "marketplace" | "profile" | "pay";
  className?: string;
}) {
  return (
    <section className={className}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            {title}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-zinc-600 dark:text-zinc-300">
            {description}
          </p>
        </div>
        <Badge tone="neutral">{items.length} suggestions</Badge>
      </div>

      {items.length === 0 ? (
        <Card className="mt-5 p-6">
          <div className="text-sm text-zinc-600 dark:text-zinc-300">{emptyState}</div>
        </Card>
      ) : (
        <div className="mt-4 grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <Card key={item.handle} className="p-3.5 sm:p-4">
              <HandleIdentity
                handle={item.handle}
                verification={item.verification}
                size="sm"
              />

              <div className="mt-2 text-base font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                {item.displayName}
              </div>
              <div className="mt-1 text-xs leading-5 text-zinc-600 dark:text-zinc-300">
                {item.reason}
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {item.isListed ? (
                  <Badge tone="orange" className="px-2 py-0.5 text-[11px]">
                    Listed now
                  </Badge>
                ) : null}
                {item.askAmount != null ? (
                  <Badge tone="neutral" className="px-2 py-0.5 text-[11px]">
                    {formatCurrency(item.askAmount)}
                  </Badge>
                ) : null}
                <Badge
                  tone={trustTone(item.trustScore)}
                  className="px-2 py-0.5 text-[11px]"
                >
                  Trust {item.trustScore}
                </Badge>
                {item.badges.slice(0, 1).map((badge) => (
                  <Badge
                    key={`${item.handle}-${badge}`}
                    tone="neutral"
                    className="px-2 py-0.5 text-[11px]"
                  >
                    {badge}
                  </Badge>
                ))}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href={`/h/${item.handle}`}
                  className="inline-flex h-9 items-center justify-center rounded-lg bg-zinc-950 px-3 text-[11px] font-semibold text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                >
                  View profile
                </Link>
                <Link
                  href={
                    mode === "marketplace" || item.isListed
                      ? `/marketplace/${item.handle}`
                      : `/pay/${item.handle}`
                  }
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-zinc-200/80 px-3 text-[11px] font-semibold text-zinc-950 transition hover:bg-zinc-50 dark:border-zinc-800/80 dark:text-zinc-50 dark:hover:bg-zinc-900"
                >
                  {mode === "marketplace" || item.isListed ? "Open listing" : "Open pay page"}
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
