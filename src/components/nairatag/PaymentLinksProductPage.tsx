import Link from "next/link";

import { AppPageHeader } from "./AppPageHeader";
import { Badge, ButtonLink, Container, cn } from "./ui";

const NAIRA = "\u20A6";

function PayLinkPreview({ dark = false }: { dark?: boolean }) {
  return (
    <div
      className={cn(
        "w-full max-w-md rounded-[1.7rem] border p-4 shadow-2xl",
        dark
          ? "border-white/10 bg-zinc-950/88 text-white shadow-black/40"
          : "border-white/65 bg-white/92 text-zinc-950 shadow-zinc-950/12"
      )}
    >
      <div className="flex items-start gap-4">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-violet-600 text-2xl font-bold text-white shadow-lg shadow-violet-600/25">
          {NAIRA}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-2">
            <Badge tone="verify" className="px-2 py-0.5 text-[11px]">
              Verified
            </Badge>
            <Badge tone="neutral" className="px-2 py-0.5 text-[11px]">
              Trust 82
            </Badge>
          </div>
          <div className="mt-2 truncate text-3xl font-semibold tracking-tight">
            {NAIRA}femi
          </div>
          <div className={cn("mt-1 text-sm", dark ? "text-zinc-300" : "text-zinc-600")}>
            Victor Adeyemi
          </div>
        </div>
      </div>

      <div className={cn("mt-5 grid grid-cols-2 rounded-2xl border p-1", dark ? "border-white/10 bg-white/5" : "border-zinc-200 bg-zinc-50")}>
        <div className="rounded-xl bg-violet-600 py-3 text-center text-sm font-semibold text-white">
          Fiat
        </div>
        <div className={cn("py-3 text-center text-sm font-semibold", dark ? "text-zinc-300" : "text-zinc-600")}>
          Crypto
        </div>
      </div>

      <div className={cn("mt-4 rounded-2xl border p-4", dark ? "border-white/10 bg-white/5" : "border-zinc-200 bg-white")}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">Pay via Bank Transfer</div>
            <div className={cn("mt-1 text-xs", dark ? "text-zinc-400" : "text-zinc-500")}>
              GTBank
            </div>
          </div>
          <Badge tone="verify" className="px-2 py-0.5 text-[11px]">
            Recommended
          </Badge>
        </div>
        <div className="mt-4 grid gap-3">
          <div>
            <div className={cn("text-[10px] font-semibold uppercase tracking-[0.12em]", dark ? "text-zinc-500" : "text-zinc-400")}>
              Account Number
            </div>
            <div className="mt-1 text-xl font-semibold">0123456789</div>
          </div>
          <div className="flex items-end justify-between border-t border-zinc-200/60 pt-3 dark:border-white/10">
            <div>
              <div className={cn("text-[10px] font-semibold uppercase tracking-[0.12em]", dark ? "text-zinc-500" : "text-zinc-400")}>
                You are paying
              </div>
              <div className="mt-1 text-2xl font-semibold">{NAIRA}5,000</div>
            </div>
            <div className="rounded-xl bg-violet-600 px-4 py-3 text-xs font-semibold text-white">
              Pay
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HeroScene() {
  return (
    <section className="relative isolate overflow-hidden bg-zinc-950 text-white">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(124,58,237,0.55),transparent_32%),radial-gradient(circle_at_80%_12%,rgba(34,197,94,0.28),transparent_28%),linear-gradient(135deg,#09090b_0%,#181028_48%,#0b1220_100%)]" />
        <div className="absolute inset-0 opacity-[0.16] [background-image:linear-gradient(rgba(255,255,255,.18)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.18)_1px,transparent_1px)] [background-size:44px_44px]" />
      </div>

      <Container className="relative grid min-h-[calc(100vh-4.5rem)] items-center gap-8 py-14 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,30rem)]">
        <div className="max-w-3xl">
          <Badge tone="inverted">NairaTag PayLinks</Badge>
          <h1 className="mt-6 max-w-3xl text-5xl font-semibold tracking-tight text-white sm:text-6xl lg:text-7xl">
            One payment link for bank transfers and Base USDC.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-200">
            Create a link like `/pay/femi`, share it anywhere, and let senders choose fiat or crypto without typing account numbers or wallet addresses.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/pay/femi" className="bg-violet-600 hover:bg-violet-500 hover:brightness-100">
              Open demo link
            </ButtonLink>
            <ButtonLink href="/pay/femi?asset=USDC&chain=base&amount=10" variant="secondary" className="border-white/25 bg-white/10 text-white hover:bg-white/15">
              Demo crypto route
            </ButtonLink>
          </div>
        </div>

        <div className="relative hidden justify-end lg:flex">
          <PayLinkPreview dark />
        </div>
      </Container>
    </section>
  );
}

function FeatureCard({
  title,
  body,
  label,
}: {
  title: string;
  body: string;
  label: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200/75 bg-white p-5 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-950/45">
      <Badge tone="neutral" className="px-2 py-0.5 text-[11px]">
        {label}
      </Badge>
      <h3 className="mt-4 text-xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
        {body}
      </p>
    </div>
  );
}

export function PaymentLinksProductPage() {
  return (
    <div className="min-h-screen bg-white text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      <AppPageHeader ctaHref="/pay/femi" ctaLabel="Open demo" />
      <HeroScene />

      <main>
        <section className="border-b border-zinc-200/70 bg-zinc-50 py-14 dark:border-zinc-800/80 dark:bg-zinc-950">
          <Container className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(22rem,28rem)] lg:items-center">
            <div>
              <Badge tone="orange">Live payment surface</Badge>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-4xl">
                Your link becomes a two-route checkout.
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-600 dark:text-zinc-300">
                Fiat stays familiar for Nigerian users. Crypto adds Base USDC for global payers. The sender never has to ask for bank details or paste a raw wallet address.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <FeatureCard
                  label="01"
                  title={`${NAIRA}handle identity`}
                  body="A public recipient card shows the handle, name, and trust signals before payment."
                />
                <FeatureCard
                  label="02"
                  title="Fiat and crypto tabs"
                  body="One PayLink can route to bank transfer or USDC on Base."
                />
                <FeatureCard
                  label="03"
                  title="Share anywhere"
                  body="Use it in WhatsApp, Telegram, bios, invoices, and AI agent flows."
                />
              </div>
            </div>
            <PayLinkPreview />
          </Container>
        </section>

        <section className="py-14">
          <Container>
            <div className="grid gap-5 lg:grid-cols-3">
              <FeatureCard
                label="Builder"
                title="Create a PayLink"
                body="Use the existing builder to create a hosted link from your claimed NairaTag handle."
              />
              <FeatureCard
                label="Resolver"
                title="Hide payment complexity"
                body="The fiat tab resolves bank details. The crypto tab resolves a verified Base wallet."
              />
              <FeatureCard
                label="Execution"
                title="Sender chooses the rail"
                body="Bank transfer remains manual. USDC transfers go wallet-to-wallet with no custody."
              />
            </div>
          </Container>
        </section>

        <section className="bg-zinc-950 py-14 text-white">
          <Container className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div>
              <Badge tone="inverted">Pitch-ready demo</Badge>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                Show the exact link investors can understand in seconds.
              </h2>
              <p className="mt-3 max-w-2xl text-base leading-7 text-zinc-300">
                Open a recipient link, switch from Fiat to Crypto, and send USDC to a human-readable NairaTag handle.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/pay/femi"
                className="inline-flex h-11 items-center justify-center rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white transition hover:bg-violet-500"
              >
                `/pay/femi`
              </Link>
              <Link
                href="/pay"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-white/20 bg-white/10 px-4 text-sm font-semibold text-white transition hover:bg-white/15"
              >
                Build a link
              </Link>
            </div>
          </Container>
        </section>
      </main>
    </div>
  );
}
