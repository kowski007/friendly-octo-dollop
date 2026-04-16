import type { ReactNode } from "react";

import { Badge, Card, CodeBlock, Container, NairaTermBadge, cn } from "./ui";

function Naira({ className }: { className?: string }) {
  return (
    <span className={cn("font-semibold", className)} aria-hidden="true">
      {"\u20A6"}
    </span>
  );
}

function SoftFeatureCard({
  title,
  description,
  footer,
  gradient,
  children,
}: {
  title: string;
  description: string;
  footer: string;
  gradient: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-3xl border border-zinc-200/70 bg-white/60 p-6 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-soft dark:border-zinc-800/70 dark:bg-zinc-950/25",
        gradient
      )}
    >
      <div className="pointer-events-none absolute inset-0 opacity-35 mix-blend-multiply dark:opacity-20" />
      <div className="relative">
        {children ? <div className="mb-5">{children}</div> : null}
        <div className="text-base font-semibold text-zinc-950 dark:text-zinc-50">
          {title}
        </div>
        <div className="mt-2 text-sm leading-7 text-zinc-600 dark:text-zinc-300">
          {description}
        </div>
        <div className="mt-5 text-xs font-semibold text-zinc-700 dark:text-zinc-200">
          {footer}
        </div>
      </div>
    </div>
  );
}

function MiniSearchMock() {
  return (
    <div className="rounded-2xl border border-white/40 bg-white/40 px-4 py-3 text-sm font-semibold text-zinc-950 shadow-sm backdrop-blur dark:border-zinc-800/70 dark:bg-zinc-950/30 dark:text-zinc-50">
      <span className="text-zinc-500 dark:text-zinc-400">
        Search handles:
      </span>{" "}
      <span className="text-zinc-950 dark:text-zinc-50">
        <Naira />
        mama_ijebu
      </span>
    </div>
  );
}

function MiniApiMock() {
  return (
    <div className="rounded-2xl border border-white/40 bg-white/40 px-4 py-3 shadow-sm backdrop-blur dark:border-zinc-800/70 dark:bg-zinc-950/30">
      <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
        Resolve via API
      </div>
      <div className="mt-2 font-mono text-xs text-zinc-950 dark:text-zinc-50">
        GET /resolve?handle=victor
      </div>
    </div>
  );
}

function MiniQrMock() {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/40 bg-white/40 px-4 py-3 shadow-sm backdrop-blur dark:border-zinc-800/70 dark:bg-zinc-950/30">
      <div className="min-w-0">
        <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
          Share your{" "}
          <NairaTermBadge
            term="handle"
            tone="neutral"
            className="relative -top-0.5 px-2.5 py-0.5 text-[11px]"
          />
        </div>
        <div className="mt-1 truncate text-sm font-semibold text-zinc-950 dark:text-zinc-50">
          <Naira />
          victor
        </div>
      </div>
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950">
        <span className="text-xs font-semibold">QR</span>
      </div>
    </div>
  );
}

function IntegrationsMock() {
  const chips = ["Bank", "Wallet", "POS", "API", "App", "SDK"];
  return (
    <div className="mt-5 grid grid-cols-3 gap-3">
      {chips.map((c) => (
        <div
          key={c}
          className="grid place-items-center rounded-2xl border border-zinc-200/70 bg-white/70 py-6 text-xs font-semibold text-zinc-700 shadow-sm backdrop-blur dark:border-zinc-800/70 dark:bg-zinc-950/30 dark:text-zinc-200"
        >
          {c}
        </div>
      ))}
    </div>
  );
}

export function FeaturesGridSection() {
  return (
    <section className="py-16 sm:py-24">
      <Container>
        <div className="text-center">
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">
            Core features
          </div>
          <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-5xl">
            Built for speed and trust.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-zinc-600 dark:text-zinc-300">
            Everything you need to go from a{" "}
            <NairaTermBadge
              term="handle"
              tone="neutral"
              className="relative -top-0.5"
            />{" "}
            to a verified recipient preview inside your product.
          </p>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          <SoftFeatureCard
            title="Handle discovery"
            description="Check availability, validate formatting, and keep handles consistent across apps."
            footer="Sample: ₦victor, ₦mikki, ₦fioso"
            gradient="bg-gradient-to-br from-orange-50/80 via-white/40 to-emerald-50/60 dark:from-orange-950/20 dark:via-zinc-950/10 dark:to-emerald-950/20"
          >
            <MiniSearchMock />
          </SoftFeatureCard>

          <SoftFeatureCard
            title="API access"
            description="Resolve handles to identity previews. Show name + bank before users send money."
            footer="Drop-in for send flows and payouts"
            gradient="bg-gradient-to-br from-zinc-50/70 via-white/40 to-orange-50/70 dark:from-zinc-950/25 dark:via-zinc-950/10 dark:to-orange-950/20"
          >
            <MiniApiMock />
          </SoftFeatureCard>

          <SoftFeatureCard
            title="Shareable identities"
            description="Handles are easy to share. Add QR for fast payments across chats and invoices."
            footer="Copy, paste, scan, pay"
            gradient="bg-gradient-to-br from-emerald-50/70 via-white/40 to-zinc-50/70 dark:from-emerald-950/20 dark:via-zinc-950/10 dark:to-zinc-950/25"
          >
            <MiniQrMock />
          </SoftFeatureCard>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-12">
          <Card className="p-6 lg:col-span-7">
            <Badge tone="verify">Identity preview</Badge>
            <div className="mt-4 text-xl font-semibold text-zinc-950 dark:text-zinc-50">
              Confirm recipients before the transfer.
            </div>
            <div className="mt-2 text-sm leading-7 text-zinc-600 dark:text-zinc-300">
              The user sees the handle, the name, and the bank destination
              upfront. It’s simple, and it’s what people expect.
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-zinc-200/70 bg-white/70 p-4 shadow-sm backdrop-blur dark:border-zinc-800/70 dark:bg-zinc-950/25">
                <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                  Recipient
                </div>
                <div className="mt-2 text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                  <Naira />
                  victor <span className="text-emerald-700">✓</span>
                </div>
                <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
                  Victor Adeyemi · GTBank
                </div>
              </div>
              <div className="rounded-2xl border border-zinc-200/70 bg-white/70 p-4 shadow-sm backdrop-blur dark:border-zinc-800/70 dark:bg-zinc-950/25">
                <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                  Amount
                </div>
                <div className="mt-2 text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                  ₦25,000
                </div>
                <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
                  Preview only, before send
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6 lg:col-span-5">
            <Badge tone="orange">Controls</Badge>
            <div className="mt-4 text-xl font-semibold text-zinc-950 dark:text-zinc-50">
              Clear badges for people and businesses.
            </div>
            <div className="mt-2 text-sm leading-7 text-zinc-600 dark:text-zinc-300">
              The same UI works for personal handles and merchant identities
              with a business badge.
            </div>
            <div className="mt-6 space-y-3">
              <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50/70 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                <div className="text-sm font-semibold text-emerald-950 dark:text-emerald-100">
                  <Naira />
                  mama_ijebu ✓ Verified
                </div>
                <div className="mt-1 text-xs text-emerald-900/80 dark:text-emerald-200">
                  Iya Basira · UBA
                </div>
              </div>
              <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50/70 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                <div className="text-sm font-semibold text-emerald-950 dark:text-emerald-100">
                  <Naira />
                  shop ✓✓ Business
                </div>
                <div className="mt-1 text-xs text-emerald-900/80 dark:text-emerald-200">
                  Shop by Kemi · Access Bank
                </div>
              </div>
            </div>
          </Card>

          <div className="lg:col-span-4">
            <div className="rounded-3xl border border-orange-200/70 bg-orange-50/60 p-6 shadow-sm backdrop-blur dark:border-orange-900/60 dark:bg-orange-950/20">
              <div className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
                Merchant payments
              </div>
              <div className="mt-2 text-sm leading-7 text-zinc-600 dark:text-zinc-300">
                Pay vendors with a handle. Confirm identity before the money
                leaves your account.
              </div>
              <div className="mt-5 rounded-2xl bg-white/70 px-4 py-3 text-sm font-semibold text-zinc-950 shadow-sm dark:bg-zinc-950/30 dark:text-zinc-50">
                Pay <Naira />
                mama_ijebu
              </div>
            </div>
          </div>

          <div className="lg:col-span-4">
            <div className="rounded-3xl border border-zinc-200/70 bg-zinc-950 p-6 text-zinc-50 shadow-sm dark:border-zinc-800/70">
              <div className="text-lg font-semibold">Secure and reliable</div>
              <div className="mt-2 text-sm leading-7 text-zinc-200">
                Simple resolution endpoint your team can integrate without
                changing how your payments settle.
              </div>
              <div className="mt-5">
                <CodeBlock code={"GET /resolve?handle=victor"} />
              </div>
            </div>
          </div>

          <div className="lg:col-span-4">
            <div className="rounded-3xl border border-zinc-200/70 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-zinc-800/70 dark:bg-zinc-950/25">
              <div className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
                Integrations
              </div>
              <div className="mt-2 text-sm leading-7 text-zinc-600 dark:text-zinc-300">
                Designed to work across apps and rails: wallets, bank transfers,
                checkout, and payouts.
              </div>
              <IntegrationsMock />
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
