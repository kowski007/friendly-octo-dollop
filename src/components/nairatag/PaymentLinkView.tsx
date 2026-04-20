import Link from "next/link";

import type { BankAccountRecord, ClaimRecord } from "@/lib/adminTypes";
import { AppPageHeader } from "./AppPageHeader";
import { CopyButton } from "./CopyButton";
import {
  Badge,
  ButtonLink,
  Card,
  CheckIcon,
  Container,
  NairaTermBadge,
  SectionHeader,
  cn,
} from "./ui";

type PublicBankAccount = BankAccountRecord & {
  accountNumber: string;
};

function formatCurrency(amount: number | null) {
  if (amount === null) return null;
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatAmount(input?: string) {
  if (!input) return null;
  const value = Number(input);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(value);
}

function verificationTone(verification: ClaimRecord["verification"]) {
  return verification === "pending" ? "neutral" : "verify";
}

function presentRecipientName(claim: ClaimRecord | null, fallbackHandle: string) {
  if (!claim) return `₦${fallbackHandle}`;
  const name = claim.displayName.trim();
  if (!name || /^pending verification$/i.test(name)) {
    return `₦${fallbackHandle}`;
  }
  return name;
}

function qrBits(seed: string) {
  const bits: boolean[] = [];
  let state = 0;
  for (const char of seed) {
    state = (state * 33 + char.charCodeAt(0)) % 2147483647;
  }
  for (let i = 0; i < 21 * 21; i++) {
    state = (state * 1103515245 + 12345) % 2147483647;
    bits.push(state % 5 !== 0);
  }
  return bits;
}

function QrPreview({ seed }: { seed: string }) {
  const bits = qrBits(seed);

  return (
    <div className="rounded-[2rem] border border-zinc-200/70 bg-white p-5 shadow-sm dark:border-zinc-800/70 dark:bg-zinc-950">
      <div className="grid grid-cols-[repeat(21,minmax(0,1fr))] gap-[2px] rounded-2xl bg-zinc-100 p-3 dark:bg-zinc-900">
        {bits.map((on, index) => (
          <div
            key={index}
            className={cn(
              "aspect-square rounded-[2px]",
              on ? "bg-zinc-950 dark:bg-zinc-50" : "bg-transparent"
            )}
          />
        ))}
      </div>
    </div>
  );
}

function AmountPill({ amount }: { amount: number }) {
  return (
    <Link
      href={`?amount=${amount}`}
      className="inline-flex rounded-full border border-zinc-200/70 bg-white/80 px-3 py-2 text-sm font-semibold text-zinc-900 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-800/80 dark:bg-zinc-950/40 dark:text-zinc-50 dark:hover:bg-zinc-900/70"
    >
      {formatCurrency(amount)}
    </Link>
  );
}

export function PaymentLinkView({
  handle,
  payment,
  requestedAmount,
  note,
  shareUrl,
}: {
  handle: string;
  payment: {
    claim: ClaimRecord;
    bankAccount: PublicBankAccount | null;
  } | null;
  requestedAmount: number | null;
  note?: string;
  shareUrl: string;
}) {
  const claim = payment?.claim ?? null;
  const bankAccount = payment?.bankAccount ?? null;
  const amountLabel = formatCurrency(requestedAmount);
  const recipientName = presentRecipientName(claim, handle);
  const shareText = amountLabel
    ? `Pay ${amountLabel} to ₦${handle}${note ? ` for ${note}` : ""}`
    : `Pay ₦${handle}${note ? ` for ${note}` : ""}`;

  return (
    <div className="min-h-screen bg-white text-zinc-950 transition-colors dark:bg-zinc-950 dark:text-zinc-50">
      <AppPageHeader ctaHref="/marketplace" ctaLabel="Explore handles" />

      <main className="py-14 sm:py-18">
        <Container className="space-y-8">
          <SectionHeader
            eyebrow="Payment link"
            title={`Pay ${recipientName}`}
            description={
              claim
                ? "Resolve the right recipient before money moves. This hosted link is the Phase 2 bridge until partner apps embed NairaTag directly."
                : "This handle has not been claimed yet. You can still reserve it or share a better payment link once the owner claims it."
            }
          />

          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <Card className="p-6 sm:p-7">
              {!claim ? (
                <div className="space-y-5">
                  <Badge tone="orange">Handle not claimed yet</Badge>
                  <div className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                    ₦{handle} is still available.
                  </div>
                  <p className="max-w-2xl text-base leading-7 text-zinc-600 dark:text-zinc-300">
                    Nobody owns this payment identity yet, so there is no verified destination to pay into.
                    Claim it first or choose another handle.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <ButtonLink href="/agent">Claim this handle</ButtonLink>
                    <ButtonLink href="/" variant="secondary">
                      Back home
                    </ButtonLink>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={verificationTone(claim.verification)}>
                          {claim.verification === "pending" ? "Claimed" : "Verified"}
                        </Badge>
                        <NairaTermBadge term="handle" tone="orange" />
                      </div>
                      <h1 className="mt-4 text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-5xl">
                        ₦{claim.handle}
                      </h1>
                      <div className="mt-3 text-lg text-zinc-600 dark:text-zinc-300">
                        {recipientName}
                      </div>
                    </div>

                    <QrPreview seed={`${handle}-${requestedAmount ?? "open"}-${note ?? ""}`} />
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <Card className="rounded-[1.75rem] border-orange-200/60 bg-orange-50/70 p-5 dark:border-orange-900/40 dark:bg-orange-950/15">
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                        Requested amount
                      </div>
                      <div className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                        {amountLabel ?? "Flexible"}
                      </div>
                      <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                        {note ? note : "Let the sender choose the amount."}
                      </div>
                    </Card>

                    <Card className="rounded-[1.75rem] p-5">
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                        Destination bank
                      </div>
                      <div className="mt-3 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                        {claim.bank}
                      </div>
                      <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                        {bankAccount ? "Bank account is linked and ready." : "Recipient still needs to finish payout setup."}
                      </div>
                    </Card>

                    <Card className="rounded-[1.75rem] border-emerald-200/60 bg-emerald-50/70 p-5 dark:border-emerald-900/40 dark:bg-emerald-950/15">
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                        Share link
                      </div>
                      <div className="mt-3 text-base font-semibold text-zinc-950 dark:text-zinc-50">
                        Send this payment page anywhere
                      </div>
                      <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                        Works in DMs, chat threads, bio links, and invoices.
                      </div>
                    </Card>
                  </div>

                  <div className="grid gap-5 xl:grid-cols-[1fr_0.95fr]">
                    <Card className="rounded-[2rem] p-6">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                            Transfer details
                          </div>
                          <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                            Resolve the person first, then pay into the linked destination.
                          </div>
                        </div>
                        <Badge tone={bankAccount ? "verify" : "neutral"}>
                          {bankAccount ? bankAccount.status.replace("_", " ") : "needs linking"}
                        </Badge>
                      </div>

                      <div className="mt-5 space-y-4">
                        <div className="rounded-3xl border border-zinc-200/70 bg-zinc-50/80 p-4 dark:border-zinc-800/70 dark:bg-zinc-900/40">
                          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
                            Recipient
                          </div>
                          <div className="mt-2 text-xl font-semibold text-zinc-950 dark:text-zinc-50">
                            {recipientName}
                          </div>
                          <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                            ₦{claim.handle}
                          </div>
                        </div>

                        <div className="rounded-3xl border border-zinc-200/70 bg-zinc-50/80 p-4 dark:border-zinc-800/70 dark:bg-zinc-900/40">
                          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
                            Bank
                          </div>
                          <div className="mt-2 text-xl font-semibold text-zinc-950 dark:text-zinc-50">
                            {claim.bank}
                          </div>
                          <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                            {bankAccount?.accountName ?? "Account name will surface once provider lookup is enabled."}
                          </div>
                        </div>

                        <div className="rounded-3xl border border-zinc-200/70 bg-zinc-50/80 p-4 dark:border-zinc-800/70 dark:bg-zinc-900/40">
                          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
                            Account number
                          </div>
                          <div className="mt-2 text-xl font-semibold tracking-[0.18em] text-zinc-950 dark:text-zinc-50">
                            {bankAccount?.accountNumber ?? "Not published yet"}
                          </div>
                          <div className="mt-3 flex flex-wrap gap-3">
                            {bankAccount?.accountNumber ? (
                              <CopyButton value={bankAccount.accountNumber} label="Copy account no." />
                            ) : null}
                            <CopyButton value={shareUrl} label="Copy payment link" copiedLabel="Link copied" />
                          </div>
                        </div>
                      </div>
                    </Card>

                    <Card className="rounded-[2rem] p-6">
                      <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                        Quick send presets
                      </div>
                      <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                        Use hosted links for common amounts while the widget and partner embeds come later.
                      </div>

                      <div className="mt-5 flex flex-wrap gap-3">
                        {[2000, 5000, 10000, 25000].map((amount) => (
                          <AmountPill key={amount} amount={amount} />
                        ))}
                      </div>

                      <div className="mt-6 rounded-[1.75rem] border border-zinc-200/70 bg-white/70 p-5 dark:border-zinc-800/70 dark:bg-zinc-950/35">
                        <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                          Why this works now
                        </div>
                        <ul className="mt-4 space-y-3 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                          <li className="flex items-start gap-3">
                            <CheckIcon className="mt-0.5 h-4 w-4 text-emerald-500" />
                            Sender sees the handle owner before initiating a transfer.
                          </li>
                          <li className="flex items-start gap-3">
                            <CheckIcon className="mt-0.5 h-4 w-4 text-emerald-500" />
                            Shareable links give NairaTag a usable payment surface before partner embeds go live.
                          </li>
                          <li className="flex items-start gap-3">
                            <CheckIcon className="mt-0.5 h-4 w-4 text-emerald-500" />
                            The same route can later upgrade into full processor-backed checkout.
                          </li>
                        </ul>
                      </div>

                      <div className="mt-6 rounded-[1.75rem] border border-orange-200/70 bg-orange-50/80 p-5 dark:border-orange-900/50 dark:bg-orange-950/15">
                        <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                          Suggested share copy
                        </div>
                        <p className="mt-3 text-sm leading-6 text-zinc-700 dark:text-zinc-200">
                          {shareText}
                        </p>
                        <div className="mt-4">
                          <CopyButton value={`${shareText} — ${shareUrl}`} label="Copy share text" />
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>
              )}
            </Card>

            <div className="space-y-5">
              <Card className="p-6">
                <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                  Payment link format
                </div>
                <div className="mt-3 text-sm leading-7 text-zinc-600 dark:text-zinc-300">
                  Hosted links are the Phase 2 surface until fintech apps and merchant tools embed NairaTag directly.
                </div>
                <div className="mt-5 rounded-2xl border border-zinc-200/70 bg-zinc-50/80 px-4 py-3 text-sm font-medium text-zinc-700 dark:border-zinc-800/80 dark:bg-zinc-900/40 dark:text-zinc-200">
                  {shareUrl}
                </div>
                <div className="mt-4">
                  <CopyButton value={shareUrl} className="w-full" label="Copy public link" />
                </div>
              </Card>

              <Card className="p-6">
                <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                  Next Phase 2 upgrade
                </div>
                <ul className="mt-4 space-y-3 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                  <li className="flex items-start gap-3">
                    <CheckIcon className="mt-0.5 h-4 w-4 text-emerald-500" />
                    Mono Lookup for live account-name verification
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckIcon className="mt-0.5 h-4 w-4 text-emerald-500" />
                    Processor-backed checkout and mini pay sheet
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckIcon className="mt-0.5 h-4 w-4 text-emerald-500" />
                    Partner app embeds using the same hosted payment format
                  </li>
                </ul>
              </Card>

              <Card className="p-6">
                <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                  Explore the network
                </div>
                <div className="mt-3 flex flex-wrap gap-3">
                  <ButtonLink href="/marketplace" variant="secondary">
                    Browse marketplace
                  </ButtonLink>
                  <ButtonLink href="/map" variant="secondary">
                    Open live map
                  </ButtonLink>
                </div>
              </Card>
            </div>
          </div>
        </Container>
      </main>
    </div>
  );
}

export { formatAmount };
