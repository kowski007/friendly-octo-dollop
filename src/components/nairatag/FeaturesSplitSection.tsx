import type { ReactNode } from "react";

import { Badge, ButtonLink, CheckIcon, Container, NairaTermBadge, cn } from "./ui";

function Naira({ className }: { className?: string }) {
  return (
    <span className={cn("font-semibold", className)} aria-hidden="true">
      {"\u20A6"}
    </span>
  );
}

function SmallSignal({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/80 p-4 shadow-sm dark:bg-zinc-950/50">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
        {label}
      </div>
      <div className="mt-2 text-sm font-semibold text-zinc-950 dark:text-zinc-50">
        {value}
      </div>
    </div>
  );
}

function ResolveScene() {
  return (
    <div className="relative overflow-hidden rounded-[2rem] bg-zinc-100/70 p-5 shadow-sm dark:bg-zinc-950/25 sm:p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-[1.6rem] bg-orange-50 p-5 dark:bg-orange-950/25">
          <div className="text-xs font-semibold text-orange-900/70 dark:text-orange-100/75">
            Search
          </div>
          <div className="mt-6 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            <Naira />
            mama_ijebu
          </div>
          <div className="mt-5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-emerald-700 shadow-sm dark:bg-zinc-950 dark:text-emerald-300">
            Available and verified
          </div>
        </div>

        <div className="space-y-4">
          <SmallSignal label="Name" value="Iya Basira" />
          <SmallSignal label="Bank" value="UBA - 0934" />
          <SmallSignal label="Safety" value="No recent disputes" />
        </div>
      </div>
      <div className="mt-4 rounded-[1.6rem] bg-zinc-950 p-5 text-white dark:bg-white dark:text-zinc-950">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold opacity-60">Transfer preview</div>
            <div className="mt-2 text-xl font-semibold">Confirm before send</div>
          </div>
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-500 text-white">
            <CheckIcon className="h-5 w-5" />
          </span>
        </div>
      </div>
    </div>
  );
}

function TrustScene() {
  const rows = [
    ["BVN", "Linked"],
    ["Bank", "Name matched"],
    ["Profile", "Public"],
    ["Marketplace", "Eligible"],
  ];

  return (
    <div className="rounded-[2rem] bg-white/80 p-5 shadow-sm backdrop-blur dark:bg-zinc-950/35 sm:p-6">
      <div className="flex items-center justify-between">
        <Badge tone="verify">Trust card</Badge>
        <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
          Score
        </div>
      </div>
      <div className="mt-6 grid gap-5 sm:grid-cols-[0.8fr_1.2fr] sm:items-center">
        <div className="rounded-[1.6rem] bg-orange-500 p-5 text-white">
          <div className="text-xs font-semibold text-white/70">Trust score</div>
          <div className="mt-4 text-6xl font-semibold tracking-tight">86</div>
          <div className="mt-2 text-sm font-semibold text-white/80">
            Strong recipient confidence
          </div>
        </div>
        <div className="space-y-3">
          {rows.map(([label, value]) => (
            <div
              key={label}
              className="flex items-center justify-between rounded-2xl bg-zinc-50 px-4 py-3 text-sm dark:bg-zinc-900/60"
            >
              <span className="font-semibold text-zinc-500 dark:text-zinc-400">
                {label}
              </span>
              <span className="font-semibold text-zinc-950 dark:text-zinc-50">
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SplitRow({
  eyebrow,
  title,
  description,
  ctaLabel,
  ctaHref,
  visual,
  reverse = false,
}: {
  eyebrow: string;
  title: ReactNode;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  visual: ReactNode;
  reverse?: boolean;
}) {
  return (
    <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
      <div className={cn("lg:col-span-5", reverse && "lg:col-start-8")}>
        <Badge tone={reverse ? "verify" : "orange"}>{eyebrow}</Badge>
        <h3 className="mt-4 font-display text-4xl font-semibold leading-[1.06] tracking-tight text-zinc-950 dark:text-zinc-50">
          {title}
        </h3>
        <p className="mt-4 max-w-xl text-base leading-7 text-zinc-700 dark:text-zinc-200">
          {description}
        </p>
        <div className="mt-6">
          <ButtonLink href={ctaHref}>{ctaLabel}</ButtonLink>
        </div>
      </div>

      <div className={cn("lg:col-span-7", reverse && "lg:col-start-1")}>
        {visual}
      </div>
    </div>
  );
}

export function FeaturesSplitSection() {
  return (
    <section id="features" className="py-10 sm:py-16">
      <Container>
        <div className="space-y-10 sm:space-y-14">
          <SplitRow
            eyebrow="Core product"
            title={
              <>
                Resolve a{" "}
                <NairaTermBadge
                  term="handle"
                  tone="orange"
                  className="relative -top-1 px-3.5 py-1.5 text-base sm:px-4 sm:py-2 sm:text-lg"
                />{" "}
                before money moves.
              </>
            }
            description="The platform turns a name into a recipient preview: handle, legal-ish name signal, bank destination, and verification state."
            ctaLabel="See services"
            ctaHref="#services"
            visual={<ResolveScene />}
          />

          <SplitRow
            eyebrow="Trust layer"
            title="A visual trust score for payment identity."
            description="Verification badges, bank matching, public profile signals, and marketplace history can sit together in one decision screen."
            ctaLabel="Try the live demo"
            ctaHref="#demo"
            visual={<TrustScene />}
            reverse
          />
        </div>
      </Container>
    </section>
  );
}
