import Link from "next/link";

import type {
  BankAccountRecord,
  ClaimRecord,
  CreditProfile,
  HandleReputation,
} from "@/lib/adminTypes";
import { AppPageHeader } from "./AppPageHeader";
import { CopyButton } from "./CopyButton";
import { Badge, ButtonLink, Card, Container, cn } from "./ui";

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

function formatCompactCurrency(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount);
}

function verificationTone(verification: ClaimRecord["verification"]) {
  return verification === "pending" ? "neutral" : "verify";
}

function trustTone(score: number) {
  if (score >= 75) return "verify";
  if (score >= 50) return "orange";
  return "neutral";
}

function creditTone(profile: CreditProfile | null) {
  if (!profile) return "neutral";
  if (profile.riskBand === "low") return "verify";
  if (profile.riskBand === "medium") return "orange";
  return "neutral";
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
    <div className="rounded-[1.75rem] border border-zinc-200/70 bg-white p-4 shadow-sm dark:border-zinc-800/70 dark:bg-zinc-950">
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

function AmountPill({ amount, note }: { amount: number; note?: string }) {
  const params = new URLSearchParams({ amount: String(amount) });
  if (note) params.set("note", note);

  return (
    <Link
      href={`?${params.toString()}`}
      className="inline-flex rounded-full border border-zinc-200/70 bg-white/80 px-3 py-2 text-sm font-semibold text-zinc-900 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-800/80 dark:bg-zinc-950/40 dark:text-zinc-50 dark:hover:bg-zinc-900/70"
    >
      {formatCurrency(amount)}
    </Link>
  );
}

function MetricCard({
  label,
  value,
  caption,
}: {
  label: string;
  value: string | number;
  caption?: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200/70 bg-white/85 p-4 dark:border-zinc-800/70 dark:bg-zinc-950/45">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
        {value}
      </div>
      {caption ? (
        <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{caption}</div>
      ) : null}
    </div>
  );
}

export function PaymentLinkView({
  handle,
  payment,
  reputation,
  creditProfile,
  requestedAmount,
  note,
  shareUrl,
}: {
  handle: string;
  payment: {
    claim: ClaimRecord;
    bankAccount: PublicBankAccount | null;
  } | null;
  reputation: HandleReputation | null;
  creditProfile: CreditProfile | null;
  requestedAmount: number | null;
  note?: string;
  shareUrl: string;
}) {
  const claim = payment?.claim ?? null;
  const bankAccount = payment?.bankAccount ?? null;
  const amountLabel = formatCurrency(requestedAmount);
  const recipientName = presentRecipientName(claim, handle);
  const trustScore = reputation?.trustScore ?? 12;
  const destinationStatus = bankAccount
    ? bankAccount.status.replace(/_/g, " ")
    : "needs linking";

  return (
    <div className="min-h-screen bg-white text-zinc-950 transition-colors dark:bg-zinc-950 dark:text-zinc-50">
      <AppPageHeader ctaHref="/marketplace" ctaLabel="Explore handles" />

      <main className="py-10 sm:py-14">
        <Container className="space-y-5">
          {!claim ? (
            <Card className="p-6 sm:p-7">
              <div className="space-y-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="orange">Payment link</Badge>
                  <Badge tone="neutral">Handle not claimed</Badge>
                </div>

                <div>
                  <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-4xl">
                    ₦{handle} is still available
                  </h1>
                  <p className="mt-3 max-w-2xl text-base leading-7 text-zinc-600 dark:text-zinc-300">
                    There is no verified destination behind this handle yet. Claim it first before using it for payments.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <ButtonLink href="/agent">Claim this handle</ButtonLink>
                  <ButtonLink href="/" variant="secondary">
                    Back home
                  </ButtonLink>
                </div>
              </div>
            </Card>
          ) : (
            <>
              <Card className="p-6 sm:p-7">
                <div className="space-y-6">
                  <div className="flex flex-wrap items-start justify-between gap-5">
                    <div className="min-w-0 flex-1 space-y-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone="orange">Payment link</Badge>
                        <Badge tone={verificationTone(claim.verification)}>
                          {claim.verification === "pending" ? "Claimed" : "Verified"}
                        </Badge>
                        <Badge tone={trustTone(trustScore)}>Trust {trustScore}/100</Badge>
                      </div>

                      <div className="space-y-2">
                        <h1 className="text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-5xl">
                          ₦{claim.handle}
                        </h1>
                        <p className="text-lg text-zinc-600 dark:text-zinc-300">
                          {recipientName}
                        </p>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-zinc-500 dark:text-zinc-400">
                          <span>{claim.bank}</span>
                          <span>{amountLabel ?? "Flexible amount"}</span>
                          {note ? <span>{note}</span> : null}
                        </div>
                      </div>
                    </div>

                    <div className="mx-auto w-full max-w-[190px] sm:mx-0">
                      <QrPreview seed={`${handle}-${requestedAmount ?? "open"}-${note ?? ""}`} />
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
                    <div className="rounded-[1.75rem] border border-zinc-200/70 bg-zinc-50/75 p-5 dark:border-zinc-800/70 dark:bg-zinc-900/35">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                          Pay into
                        </div>
                        <Badge tone={bankAccount ? "verify" : "neutral"}>{destinationStatus}</Badge>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <MetricCard
                          label="Recipient"
                          value={recipientName}
                          caption={`₦${claim.handle}`}
                        />
                        <MetricCard
                          label="Bank"
                          value={claim.bank}
                          caption={bankAccount?.accountName ?? "Account name pending"}
                        />
                        <MetricCard
                          label="Amount"
                          value={amountLabel ?? "Flexible"}
                          caption={note ?? "Sender can choose any amount."}
                        />
                        <MetricCard
                          label="Account number"
                          value={bankAccount?.accountNumber ?? "Not published"}
                          caption="Copy before sending."
                        />
                      </div>
                    </div>

                    <div className="rounded-[1.75rem] border border-zinc-200/70 bg-zinc-50/75 p-5 dark:border-zinc-800/70 dark:bg-zinc-900/35">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                          Trust snapshot
                        </div>
                        <Badge tone={trustTone(trustScore)}>{trustScore}/100</Badge>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                        <MetricCard label="Payments" value={reputation?.transactionCount ?? 0} />
                        <MetricCard label="Recent 30d" value={reputation?.recentTransactionCount30d ?? 0} />
                        <MetricCard
                          label="Volume"
                          value={formatCompactCurrency(reputation?.totalVolume ?? 0)}
                        />
                      </div>

                      {creditProfile ? (
                        <div className="mt-4 rounded-2xl border border-zinc-200/70 bg-white/85 p-4 dark:border-zinc-800/70 dark:bg-zinc-950/45">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                Suggested limit
                              </div>
                              <div className="mt-2 text-xl font-semibold text-zinc-950 dark:text-zinc-50">
                                {formatCompactCurrency(creditProfile.recommendedLimit)}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                Risk
                              </div>
                              <Badge tone={creditTone(creditProfile)} className="mt-2 capitalize">
                                {creditProfile.riskBand}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ) : null}

                      <div className="mt-4 flex flex-wrap gap-2">
                        {(reputation?.badges.length ? reputation.badges : ["New handle"]).map(
                          (badge) => (
                            <Badge
                              key={badge}
                              tone={
                                badge === "Verified" ||
                                badge === "High trust" ||
                                badge === "Clean history"
                                  ? "verify"
                                  : "neutral"
                              }
                            >
                              {badge}
                            </Badge>
                          )
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {bankAccount?.accountNumber ? (
                      <CopyButton value={bankAccount.accountNumber} label="Copy account no." />
                    ) : null}
                    <CopyButton value={shareUrl} label="Copy payment link" copiedLabel="Link copied" />
                    <ButtonLink href={`/h/${claim.handle}`} variant="secondary">
                      View profile
                    </ButtonLink>
                  </div>
                </div>
              </Card>

              <Card className="p-5 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                      Quick amounts
                    </div>
                    <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                      Pick an amount and keep the same payment route.
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {[2000, 5000, 10000, 25000].map((amount) => (
                      <AmountPill key={amount} amount={amount} note={note} />
                    ))}
                  </div>
                </div>
              </Card>
            </>
          )}
        </Container>
      </main>
    </div>
  );
}

export { formatAmount };
