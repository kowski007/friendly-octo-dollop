"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { AppPageHeader } from "./AppPageHeader";
import { Badge, ButtonLink, Container, cn } from "./ui";

const NAIRA = "\u20A6";

function PreviewChip({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "neutral" | "verify" | "orange";
}) {
  return (
    <Badge tone={tone} className="px-2 py-0.5 text-[11px]">
      {label}
    </Badge>
  );
}

function PayLinkPreview({ dark = false }: { dark?: boolean }) {
  return (
    <div
      className={cn(
        "w-full max-w-md rounded-[1.55rem] border p-4 shadow-2xl sm:p-5",
        dark
          ? "border-white/10 bg-zinc-950/90 text-white shadow-black/40"
          : "border-zinc-200/80 bg-white text-zinc-950 shadow-zinc-950/10"
      )}
    >
      <div className="flex items-start gap-4">
        <div className="grid h-13 w-13 shrink-0 place-items-center rounded-2xl bg-emerald-600 text-2xl font-bold text-white shadow-lg shadow-emerald-600/20">
          {NAIRA}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-2">
            <PreviewChip label="Verified" tone="verify" />
            <PreviewChip label="Trust 86" />
          </div>
          <div className="mt-2 truncate text-2xl font-semibold tracking-tight sm:text-3xl">
            {NAIRA}studio84
          </div>
          <div className={cn("mt-1 text-sm", dark ? "text-zinc-300" : "text-zinc-600")}>
            Studio Eighty Four
          </div>
        </div>
      </div>

      <div
        className={cn(
          "mt-5 grid grid-cols-2 rounded-2xl border p-1",
          dark ? "border-white/10 bg-white/5" : "border-zinc-200 bg-zinc-50"
        )}
      >
        <div className="rounded-xl bg-emerald-600 py-3 text-center text-sm font-semibold text-white">
          Fiat
        </div>
        <div
          className={cn(
            "py-3 text-center text-sm font-semibold",
            dark ? "text-zinc-300" : "text-zinc-600"
          )}
        >
          Crypto
        </div>
      </div>

      <div
        className={cn(
          "mt-4 rounded-2xl border p-4",
          dark ? "border-white/10 bg-white/5" : "border-zinc-200 bg-white"
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">Pay via Bank Transfer</div>
            <div className={cn("mt-1 text-xs", dark ? "text-zinc-400" : "text-zinc-500")}>
              Moniepoint
            </div>
          </div>
          <PreviewChip label="Payout ready" tone="verify" />
        </div>

        <div className="mt-4 grid gap-3">
          <div>
            <div
              className={cn(
                "text-[10px] font-semibold uppercase tracking-[0.12em]",
                dark ? "text-zinc-500" : "text-zinc-400"
              )}
            >
              Account Number
            </div>
            <div className="mt-1 text-xl font-semibold">8052147712</div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div
              className={cn(
                "rounded-xl px-3 py-3",
                dark ? "bg-white/5" : "bg-zinc-50"
              )}
            >
              <div
                className={cn(
                  "text-[10px] font-semibold uppercase tracking-[0.12em]",
                  dark ? "text-zinc-500" : "text-zinc-400"
                )}
              >
                You are paying
              </div>
              <div className="mt-1 text-lg font-semibold">{NAIRA}25,000</div>
            </div>
            <div
              className={cn(
                "rounded-xl px-3 py-3",
                dark ? "bg-white/5" : "bg-zinc-50"
              )}
            >
              <div
                className={cn(
                  "text-[10px] font-semibold uppercase tracking-[0.12em]",
                  dark ? "text-zinc-500" : "text-zinc-400"
                )}
              >
                USDC route
              </div>
              <div className="mt-1 text-lg font-semibold">Base live</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoCard({
  label,
  title,
  body,
}: {
  label: string;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200/75 bg-white p-4 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-950/45">
      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
        {label}
      </div>
      <h3 className="mt-3 text-lg font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
        {body}
      </p>
    </div>
  );
}

function MetricBand() {
  const items = [
    ["One link", "Fiat and crypto on the same checkout"],
    ["Public identity", "Handle, recipient, and trust state shown first"],
    ["Shareable everywhere", "WhatsApp, Telegram, invoices, bios, and checkout flows"],
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {items.map(([title, body]) => (
        <div
          key={title}
          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 backdrop-blur"
        >
          <div className="text-sm font-semibold text-white">{title}</div>
          <div className="mt-1 text-sm leading-6 text-zinc-300">{body}</div>
        </div>
      ))}
    </div>
  );
}

function HeroSection() {
  return (
    <section className="border-b border-zinc-200/70 bg-zinc-950 text-white dark:border-zinc-800/80">
      <Container className="grid gap-10 py-14 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,30rem)] lg:items-center lg:py-20">
        <div className="max-w-3xl">
          <Badge tone="inverted">Payment links</Badge>
          <h1 className="mt-5 text-5xl font-semibold tracking-tight text-white sm:text-6xl">
            Hosted payment links built around real recipient identity.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-zinc-300">
            NairaTag PayLinks give each merchant, creator, or business a clean public checkout.
            Senders can pay through bank transfer or Base USDC from one hosted link, while seeing
            who they are paying before money moves.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink
              href="/pay/create"
              className="bg-emerald-600 text-white hover:bg-emerald-500 hover:brightness-100"
            >
              Create PayLink
            </ButtonLink>
            <ButtonLink
              href="/dashboard/paylinks"
              variant="secondary"
              className="border-white/20 bg-white/10 text-white hover:bg-white/15"
            >
              Open dashboard
            </ButtonLink>
          </div>

          <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-6 text-zinc-300">
            Typical route:
            <span className="ml-2 inline-flex rounded-lg bg-white/10 px-2.5 py-1 font-mono text-[13px] text-white">
              /pay/studio84/session-retainer
            </span>
          </div>
        </div>

        <div className="flex justify-start lg:justify-end">
          <PayLinkPreview dark />
        </div>
      </Container>
    </section>
  );
}

export function PaymentLinksProductPage() {
  const [isSignedIn, setIsSignedIn] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      try {
        const response = await fetch("/api/me", {
          cache: "no-store",
          headers: { "Cache-Control": "no-store" },
        });
        if (!response.ok) return;

        const data = (await response.json().catch(() => null)) as { ok?: boolean } | null;
        if (!cancelled && data?.ok) {
          setIsSignedIn(true);
        }
      } catch {
        // Leave signed-out CTA state as default.
      }
    }

    void loadSession();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-white text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      <AppPageHeader ctaHref="/pay/create" ctaLabel="Create PayLink" />
      <HeroSection />

      <main>
        <section className="bg-zinc-50 py-12 dark:bg-zinc-950">
          <Container>
            <div className="grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(22rem,28rem)] lg:items-center">
              <div>
                <Badge tone="orange">Live checkout surface</Badge>
                <h2 className="mt-4 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-4xl">
                  A real payment page, not a mocked checkout toy.
                </h2>
                <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-600 dark:text-zinc-300">
                  Every PayLink is a hosted recipient page with live payout details, trust context,
                  and route switching built in. The experience is designed for actual senders, not
                  just mocked checkout screens.
                </p>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <InfoCard
                    label="Identity"
                    title={`${NAIRA}handle first`}
                    body="The sender sees the handle, recipient name, and trust state before paying."
                  />
                  <InfoCard
                    label="Routing"
                    title="Fiat and USDC"
                    body="Bank transfer stays familiar for local users while Base USDC stays available for crypto payers."
                  />
                  <InfoCard
                    label="Distribution"
                    title="Share once"
                    body="Use the same hosted link in social profiles, invoices, WhatsApp, Telegram, and agent flows."
                  />
                </div>
              </div>

              <PayLinkPreview />
            </div>
          </Container>
        </section>

        <section className="py-12 sm:py-14">
          <Container>
            <div className="grid gap-4 lg:grid-cols-3">
              <InfoCard
                label="Builder"
                title="Create from your claimed handle"
                body="Spin up a hosted payment page from the PayLinks builder once your NairaTag handle and payout destination are ready."
              />
              <InfoCard
                label="Resolver"
                title="Hide bank and wallet complexity"
                body="The checkout resolves bank details on the fiat side and a verified Base wallet on the crypto side without exposing raw setup work."
              />
              <InfoCard
                label="Operations"
                title="Built for real collection flows"
                body="Use fixed, flexible, or guided payment requests and keep one branded link for repeated collection instead of sending details manually."
              />
            </div>

            <div className="mt-8 rounded-3xl border border-zinc-200/75 bg-zinc-950 px-5 py-6 text-white dark:border-zinc-800/80 sm:px-6">
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                <div>
                  <div className="text-2xl font-semibold tracking-tight">
                    One public payment surface for serious collections.
                  </div>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-300">
                    Use NairaTag PayLinks when you want a cleaner recipient experience than
                    sending account numbers in chat, while still supporting both fiat and crypto
                    payers from the same hosted page.
                  </p>
                </div>
                <div className="w-full max-w-3xl lg:max-w-none">
                  <MetricBand />
                </div>
              </div>
            </div>
          </Container>
        </section>

        <section className="border-t border-zinc-200/70 bg-zinc-50 py-12 dark:border-zinc-800/80 dark:bg-zinc-950/35">
          <Container>
            <div className="flex flex-col gap-5 rounded-3xl border border-zinc-200/75 bg-white px-5 py-6 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-950/45 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                  Ready to publish your own PayLink?
                </div>
                <div className="mt-2 max-w-2xl text-sm leading-7 text-zinc-600 dark:text-zinc-300">
                  Claim a handle, connect the payout destination behind it, and launch a hosted
                  payment page that looks like a real product surface instead of a pasted payment instruction.
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <ButtonLink href="/pay/create">Create Payment link</ButtonLink>
                {isSignedIn ? (
                  <ButtonLink href="/dashboard/paylinks" variant="secondary">
                    PayLinks dashboard
                  </ButtonLink>
                ) : null}
                <Link
                  href="/claim"
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-200/80 px-4 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-50 dark:border-zinc-800/80 dark:text-zinc-50 dark:hover:bg-zinc-900"
                >
                  Claim a {NAIRA}handle
                </Link>
              </div>
            </div>
          </Container>
        </section>
      </main>
    </div>
  );
}
