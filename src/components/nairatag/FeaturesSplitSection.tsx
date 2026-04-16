import type { ReactNode } from "react";

import {
  Badge,
  ButtonLink,
  Card,
  CheckIcon,
  Container,
  NairaTermBadge,
  cn,
} from "./ui";

function Naira({ className }: { className?: string }) {
  return (
    <span className={cn("font-semibold", className)} aria-hidden="true">
      {"\u20A6"}
    </span>
  );
}

function DotIcon({
  className,
  tone = "zinc",
}: {
  className?: string;
  tone?: "zinc" | "orange" | "emerald";
}) {
  const toneClasses =
    tone === "orange"
      ? "bg-orange-500 text-white"
      : tone === "emerald"
        ? "bg-emerald-600 text-white"
        : "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950";

  return (
    <span
      className={cn(
        "mt-1 inline-flex h-7 w-7 items-center justify-center rounded-xl",
        toneClasses,
        className
      )}
      aria-hidden="true"
    >
      <span className="h-2 w-2 rounded-full bg-current" />
    </span>
  );
}

function FeatureBullet({
  title,
  description,
  tone = "zinc",
}: {
  title: string;
  description: string;
  tone?: "zinc" | "orange" | "emerald";
}) {
  return (
    <div className="flex gap-3">
      <DotIcon tone={tone} />
      <div>
        <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
          {title}
        </div>
        <div className="mt-1 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
          {description}
        </div>
      </div>
    </div>
  );
}

function UiResolveMock() {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-zinc-200/70 bg-zinc-100/60 p-6 shadow-sm dark:border-zinc-800/70 dark:bg-zinc-950/25">
      <div className="absolute inset-0 bg-gradient-to-b from-white/70 to-transparent dark:from-white/5" />
      <div className="relative">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
            Recipient preview
          </div>
          <div className="rounded-full border border-zinc-200/70 bg-white/70 px-3 py-1 text-xs font-semibold text-zinc-700 shadow-sm backdrop-blur dark:border-zinc-800/70 dark:bg-zinc-950/40 dark:text-zinc-200">
            Overview
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-zinc-200/70 bg-white/80 p-5 shadow-sm backdrop-blur dark:border-zinc-800/80 dark:bg-zinc-950/40">
            <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              Handle
            </div>
            <div className="mt-2 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
              <Naira />
              victor{" "}
              <span className="ml-2 text-emerald-700 dark:text-emerald-300">
                ✓
              </span>
            </div>
            <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
              Victor Adeyemi
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200/70 bg-white/80 p-5 shadow-sm backdrop-blur dark:border-zinc-800/80 dark:bg-zinc-950/40">
            <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              Bank destination
            </div>
            <div className="mt-2 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
              GTBank
            </div>
            <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
              Account name matched
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-orange-200/70 bg-orange-50/70 p-5 shadow-sm backdrop-blur dark:border-orange-900/60 dark:bg-orange-950/20">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs font-semibold text-orange-900/80 dark:text-orange-100/80">
                Send flow
              </div>
              <div className="mt-2 truncate text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                “Confirm recipient before sending”
              </div>
            </div>
            <span className="shrink-0 rounded-full bg-zinc-950 px-3 py-1 text-xs font-semibold text-white dark:bg-white dark:text-zinc-950">
              Continue
            </span>
          </div>
        </div>

        <div className="pointer-events-none absolute -right-6 -bottom-10 h-44 w-44 rounded-full bg-orange-500/15 blur-2xl dark:bg-orange-500/20" />
        <div className="pointer-events-none absolute -left-10 -top-10 h-44 w-44 rounded-full bg-emerald-500/12 blur-2xl dark:bg-emerald-500/18" />
      </div>
    </div>
  );
}

function UiVerifyMock() {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-zinc-200/70 bg-zinc-100/60 p-6 shadow-sm dark:border-zinc-800/70 dark:bg-zinc-950/25">
      <div className="absolute inset-0 bg-gradient-to-b from-white/70 to-transparent dark:from-white/5" />
      <div className="relative">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
            Verification layer
          </div>
          <Badge tone="verify">
            <CheckIcon className="h-3.5 w-3.5" />
            Verified
          </Badge>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Card className="p-5">
            <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              Personal handle
            </div>
            <div className="mt-2 text-sm font-semibold text-zinc-950 dark:text-zinc-50">
              <Naira />
              mama_ijebu{" "}
              <span className="ml-2 text-emerald-700 dark:text-emerald-300">
                ✓ Verified
              </span>
            </div>
            <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
              Iya Basira · UBA
            </div>
          </Card>

          <Card className="p-5">
            <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              Business handle
            </div>
            <div className="mt-2 text-sm font-semibold text-zinc-950 dark:text-zinc-50">
              <Naira />
              shop{" "}
              <span className="ml-2 text-emerald-700 dark:text-emerald-300">
                ✓✓ Business
              </span>
            </div>
            <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
              Shop by Kemi · Access Bank
            </div>
          </Card>
        </div>

        <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-emerald-500/14 blur-2xl dark:bg-emerald-500/18" />
      </div>
    </div>
  );
}

function SplitRow({
  eyebrow,
  eyebrowTone = "neutral",
  title,
  description,
  bullets,
  bulletTone = "zinc",
  ctaLabel,
  ctaHref,
  mock,
  reverse = false,
}: {
  eyebrow: string;
  eyebrowTone?: "neutral" | "verify" | "orange";
  title: ReactNode;
  description: string;
  bullets: Array<{ title: string; description: string }>;
  bulletTone?: "zinc" | "orange" | "emerald";
  ctaLabel: string;
  ctaHref: string;
  mock: ReactNode;
  reverse?: boolean;
}) {
  return (
    <div className="grid gap-10 lg:grid-cols-12 lg:items-center">
      <div className={cn("lg:col-span-5", reverse && "lg:col-start-8")}>
        <Badge tone={eyebrowTone}>{eyebrow}</Badge>
        <h3 className="mt-4 font-display text-4xl font-semibold leading-[1.06] tracking-tight text-zinc-950 dark:text-zinc-50">
          {title}
        </h3>
        <p className="mt-4 text-base leading-7 text-zinc-700 dark:text-zinc-200">
          {description}
        </p>

        <div className="mt-7 grid gap-5 sm:grid-cols-2">
          {bullets.map((b) => (
            <FeatureBullet
              key={b.title}
              title={b.title}
              description={b.description}
              tone={bulletTone}
            />
          ))}
        </div>

        <div className="mt-7">
          <ButtonLink href={ctaHref}>{ctaLabel}</ButtonLink>
        </div>
      </div>

      <div className={cn("lg:col-span-7", reverse && "lg:col-start-1")}>
        {mock}
      </div>
    </div>
  );
}

export function FeaturesSplitSection() {
  return (
    <section id="features" className="py-16 sm:py-24">
      <Container>
        <div className="space-y-14 sm:space-y-20">
          <SplitRow
            eyebrow="Core features"
            eyebrowTone="orange"
            title={
              <>
                Resolve a{" "}
                <NairaTermBadge
                  term="handle"
                  tone="orange"
                  className="relative -top-1 px-3.5 py-1.5 text-base sm:px-4 sm:py-2 sm:text-lg"
                />{" "}
                before you send.
              </>
            }
            description="Instead of guessing who a 10-digit number belongs to, show a human-readable identity preview first."
            bullets={[
              {
                title: "Instant preview",
                description: "Show name + bank before transfer confirmation.",
              },
              {
                title: "Fewer mistakes",
                description: "Reduce wrong sends with identity-first flows.",
              },
              {
                title: "Better sharing",
                description: "Handles are easy to remember and easy to type.",
              },
              {
                title: "Works everywhere",
                description: "Use in send screens, invoices, and payouts.",
              },
            ]}
            bulletTone="orange"
            ctaLabel="See services"
            ctaHref="#services"
            mock={<UiResolveMock />}
          />

          <SplitRow
            eyebrow="Trust layer"
            eyebrowTone="verify"
            title="Verification people actually understand."
            description="Add clear badges and verification signals to payments so users can spot the right recipient instantly."
            bullets={[
              {
                title: "BVN checks",
                description: "Tie handles to real identities, not just strings.",
              },
              {
                title: "Name matching",
                description: "Match recipient names to bank destinations.",
              },
              {
                title: "Business handles",
                description: "Separate personal and merchant identities clearly.",
              },
              {
                title: "Fraud signals",
                description: "Surface safety signals before money moves.",
              },
            ]}
            bulletTone="emerald"
            ctaLabel="Try the live demo"
            ctaHref="#demo"
            mock={<UiVerifyMock />}
            reverse
          />
        </div>
      </Container>
    </section>
  );
}
