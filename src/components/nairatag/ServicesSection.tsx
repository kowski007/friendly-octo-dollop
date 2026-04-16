import type { ReactNode } from "react";

import { Badge, ButtonLink, Container, NairaTermBadge, cn } from "./ui";

function Naira({ className }: { className?: string }) {
  return (
    <span className={cn("font-semibold", className)} aria-hidden="true">
      {"\u20A6"}
    </span>
  );
}

function ArrowBtn({ dir }: { dir: "left" | "right" }) {
  return (
    <button
      type="button"
      aria-label={dir === "left" ? "Previous" : "Next"}
      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200/70 bg-white/70 text-zinc-700 shadow-sm backdrop-blur transition hover:bg-white dark:border-zinc-800/70 dark:bg-zinc-950/30 dark:text-zinc-200 dark:hover:bg-zinc-950/45"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
        {dir === "left" ? (
          <path
            d="M15 6l-6 6 6 6"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : (
          <path
            d="M9 6l6 6-6 6"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>
    </button>
  );
}

function MiniMetric({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-4xl">
        {value}
      </div>
      <div className="mt-1 text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">
        {label}
      </div>
    </div>
  );
}

function ServiceCard({
  title,
  description,
  bullets,
  tone = "neutral",
}: {
  title: string;
  description: string;
  bullets: ReactNode[];
  tone?: "neutral" | "highlight";
}) {
  const isHighlight = tone === "highlight";
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-3xl border p-6 shadow-sm backdrop-blur",
        isHighlight
          ? "border-orange-200/60 bg-nt-orange text-white dark:border-orange-900/50"
          : "border-zinc-200/70 bg-white/70 text-zinc-950 dark:border-zinc-800/70 dark:bg-zinc-950/30 dark:text-zinc-50"
      )}
    >
      {isHighlight ? (
        <>
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/20 blur-2xl" />
          <div className="pointer-events-none absolute -left-16 -bottom-16 h-56 w-56 rounded-full bg-black/15 blur-2xl" />
        </>
      ) : null}

      <div className="relative">
        <div className="text-lg font-semibold tracking-tight">{title}</div>
        <div
          className={cn(
            "mt-2 text-sm leading-7",
            isHighlight ? "text-white/90" : "text-zinc-600 dark:text-zinc-300"
          )}
        >
          {description}
        </div>

        <div className="mt-5 space-y-2 text-sm">
          {bullets.map((b, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <span
                className={cn(
                  "mt-1.5 inline-flex h-2 w-2 rounded-full",
                  isHighlight ? "bg-white" : "bg-nt-orange"
                )}
                aria-hidden="true"
              />
              <span className={cn(isHighlight ? "text-white" : "")}>{b}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ServicesSection() {
  return (
    <section id="services" className="py-16 sm:py-24">
      <Container>
        <div className="rounded-[36px] border border-zinc-200/70 bg-zinc-100/60 p-6 shadow-sm backdrop-blur dark:border-zinc-800/70 dark:bg-zinc-950/20 sm:p-10">
          <div className="flex items-start justify-between gap-6">
            <div>
              <Badge>Services</Badge>
              <h2 className="mt-4 max-w-xl font-display text-4xl font-semibold leading-[1.02] tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-5xl">
                Identity-first payments, for consumers and fintechs.
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-700 dark:text-zinc-200">
                NairaTag can power send flows, merchant payments, and payouts by
                resolving handles to real recipient identity previews.
              </p>
            </div>

            <div className="hidden items-center gap-2 sm:flex">
              <ArrowBtn dir="left" />
              <ArrowBtn dir="right" />
            </div>
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            <ServiceCard
              title="Consumer handles"
              description="A simple name people can share, type, and remember."
              bullets={[
                <>
                  Claim a{" "}
                  <NairaTermBadge
                    term="handle"
                    tone="orange"
                    className="relative -top-0.5"
                  />
                </>,
                "Link your bank account",
                <>
                  Share your{" "}
                  <NairaTermBadge
                    term="handle"
                    tone="orange"
                    className="relative -top-0.5"
                  />{" "}
                  or QR
                </>,
              ]}
            />
            <ServiceCard
              title="Verification layer"
              description="Clear badges and identity signals shown before money moves."
              bullets={[
                "BVN checks and identity signals",
                "Account name matching",
                "Business vs personal badges",
              ]}
              tone="highlight"
            />
            <ServiceCard
              title="Fintech integration"
              description="Drop handle resolution into existing products and rails."
              bullets={[
                "Resolve handles via API",
                "Use in send screens and payouts",
                "Partner-friendly approach",
              ]}
            />
          </div>

          <div className="mt-10 grid gap-6 border-t border-zinc-200/70 pt-10 dark:border-zinc-800/70 sm:grid-cols-4">
            <MiniMetric value="10 digits" label="Account numbers" />
            <MiniMetric value="1 handle" label="NairaTag identity" />
            <MiniMetric value="2–20" label="Handle length" />
            <MiniMetric value="3 steps" label="Claim, link, send" />
          </div>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="#demo">
              Try the live demo <Naira className="font-semibold" />
            </ButtonLink>
            <ButtonLink href="#faq" variant="secondary">
              Read FAQs
            </ButtonLink>
          </div>
        </div>
      </Container>
    </section>
  );
}
