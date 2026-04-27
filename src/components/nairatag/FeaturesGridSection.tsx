import type { ReactNode } from "react";

import { Badge, Container, cn } from "./ui";

function Naira({ className }: { className?: string }) {
  return (
    <span className={cn("font-semibold", className)} aria-hidden="true">
      {"\u20A6"}
    </span>
  );
}

function FeatureTile({
  title,
  label,
  className,
  children,
}: {
  title: string;
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative flex min-h-[250px] flex-col justify-between overflow-hidden rounded-[2rem] bg-white p-5 shadow-sm dark:bg-zinc-950/35",
        className
      )}
    >
      <div>{children}</div>
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
          {label}
        </div>
        <div className="mt-2 text-xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          {title}
        </div>
      </div>
    </div>
  );
}

function SearchVisual() {
  return (
    <div className="pt-4">
      <div className="rounded-2xl bg-white/85 p-4 shadow-sm dark:bg-zinc-950/60">
        <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
          Claim a tag
        </div>
        <div className="mt-3 flex items-center justify-between rounded-2xl bg-orange-50 px-4 py-3 dark:bg-orange-950/25">
          <div className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
            <Naira />
            kemi_stores
          </div>
          <Badge tone="verify">Open</Badge>
        </div>
      </div>
      <div className="ml-10 mt-3 rounded-full bg-white/80 px-4 py-2 text-sm font-semibold text-zinc-700 shadow-sm dark:bg-zinc-950/60 dark:text-zinc-200">
        Looks clean. Claim it.
      </div>
    </div>
  );
}

function PreviewVisual() {
  return (
    <div className="pt-4">
      <div className="mx-auto max-w-[260px] rounded-3xl bg-white p-4 shadow-sm dark:bg-zinc-950">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            Recipient
          </div>
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
        </div>
        <div className="mt-5 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          <Naira />
          victor
        </div>
        <div className="mt-1 text-sm font-medium text-zinc-600 dark:text-zinc-300">
          Victor Adeyemi
        </div>
        <div className="mt-4 rounded-2xl bg-zinc-100 px-4 py-3 text-sm font-semibold text-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
          GTBank - 1802
        </div>
      </div>
    </div>
  );
}

function PaymentLinkVisual() {
  return (
    <div className="pt-4">
      <div className="rounded-3xl bg-zinc-950 p-4 text-white shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-white/60">Share link</span>
          <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold">
            Active
          </span>
        </div>
        <div className="mt-6 text-3xl font-semibold tracking-tight">
          <Naira />
          mama_ijebu
        </div>
        <div className="mt-5 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-zinc-950">
          nairatag.app/pay/mama_ijebu
        </div>
      </div>
    </div>
  );
}

function SurfacePill({ label }: { label: string }) {
  return (
    <div className="rounded-2xl bg-white/80 px-4 py-3 text-sm font-semibold text-zinc-700 shadow-sm dark:bg-zinc-950/45 dark:text-zinc-200">
      {label}
    </div>
  );
}

export function FeaturesGridSection() {
  return (
    <section className="py-10 sm:py-16">
      <Container>
        <div className="text-center">
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-700 dark:text-orange-300">
            Everyday use
          </div>
          <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-5xl">
            One tag, many moments.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-zinc-600 dark:text-zinc-300">
            Claim it, share it, get paid with it, and show up the same way everywhere.
          </p>
        </div>

        <div className="-mx-5 mt-8 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden lg:mx-0 lg:overflow-visible lg:px-0 lg:pb-0">
          <div className="flex snap-x snap-mandatory gap-4 lg:grid lg:grid-cols-3">
            <div className="min-w-[18.5rem] snap-start lg:min-w-0">
              <FeatureTile
                label="Claim"
                title="Pick a tag that feels like you"
                className="bg-gradient-to-br from-orange-50 via-white to-zinc-50 dark:from-orange-950/25 dark:via-zinc-950 dark:to-zinc-950"
              >
                <SearchVisual />
              </FeatureTile>
            </div>

            <div className="min-w-[18.5rem] snap-start lg:min-w-0">
              <FeatureTile
                label="Pay"
                title="Let people know it is really you"
                className="bg-gradient-to-br from-zinc-50 via-white to-emerald-50 dark:from-zinc-950 dark:via-zinc-950 dark:to-emerald-950/20"
              >
                <PreviewVisual />
              </FeatureTile>
            </div>

            <div className="min-w-[18.5rem] snap-start lg:min-w-0">
              <FeatureTile
                label="Share"
                title="Drop your tag into links and QR"
                className="bg-gradient-to-br from-orange-100 via-white to-white dark:from-orange-950/25 dark:via-zinc-950 dark:to-zinc-950"
              >
                <PaymentLinkVisual />
              </FeatureTile>
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-12">
          <div className="rounded-[2rem] bg-zinc-950 p-6 text-white shadow-sm lg:col-span-5">
            <div className="flex items-center justify-between gap-3">
              <Badge tone="inverted">Culture fit</Badge>
              <span className="text-xs font-semibold text-white/45">real life</span>
            </div>
            <div className="mt-5 text-2xl font-semibold tracking-tight">
              It should feel like sharing your @, not your account number.
            </div>
            <div className="mt-5 rounded-[1.6rem] border border-white/10 bg-black/30 p-4 text-sm leading-6 text-white/78">
              Your NairaTag can live in a bio, on a flyer, in a DM, in a checkout
              link, or inside the Telegram bot without changing who you are.
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <SurfacePill label="Bio" />
              <SurfacePill label="Link" />
              <SurfacePill label="DM" />
            </div>
          </div>

          <div className="rounded-[2rem] bg-white/75 p-6 shadow-sm backdrop-blur dark:bg-zinc-950/35 lg:col-span-7">
            <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
              <div>
                <Badge tone="orange">Where it shows up</Badge>
                <div className="mt-4 max-w-lg text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                  The same name can follow you from payment to profile to community.
                </div>
              </div>
              <div className="text-right">
                <div className="text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                  6
                </div>
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
                  touchpoints
                </div>
              </div>
            </div>
            <div className="mt-7">
              <div className="-mx-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:overflow-visible sm:px-0 sm:pb-0">
                <div className="grid min-w-[34rem] grid-cols-3 gap-3 sm:min-w-0 sm:grid-cols-6">
                  {["Pay links", "Marketplace", "Profile", "Telegram", "QR", "Send flow"].map(
                    (item, index) => (
                      <div
                        key={item}
                        className={cn(
                          "grid h-20 place-items-center rounded-2xl text-sm font-semibold shadow-sm",
                          index === 1 || index === 4
                            ? "bg-orange-50 text-orange-900 dark:bg-orange-950/25 dark:text-orange-100"
                            : "bg-white/75 text-zinc-700 dark:bg-zinc-950/35 dark:text-zinc-200"
                        )}
                      >
                        {item}
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
            <div className="mt-6 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
              Your tag works across pay links, marketplace listings, public profiles,
              Telegram, and direct send flows.
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
