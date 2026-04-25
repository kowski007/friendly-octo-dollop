import type {
  MarketplaceListingDetail,
  PublicHandleSuggestion,
} from "@/lib/adminTypes";

import { AppPageHeader } from "./AppPageHeader";
import { HandleIdentity, SuggestedHandlesSection } from "./HandleTrust";
import { MarketplaceOfferForm } from "./MarketplaceOfferForm";
import { Badge, ButtonLink, Card, Container, SectionHeader } from "./ui";

function formatCurrency(amount?: number | null) {
  if (amount == null) return "Open to offers";
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatCompactCurrency(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount);
}

function creditTone(riskBand?: "low" | "medium" | "high") {
  if (riskBand === "low") return "verify";
  if (riskBand === "medium") return "orange";
  return "neutral";
}

export function MarketplaceListingDetailView({
  detail,
  suggestions,
}: {
  detail: MarketplaceListingDetail | null;
  suggestions: PublicHandleSuggestion[];
}) {
  if (!detail) {
    return (
      <div className="min-h-screen bg-white text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
        <AppPageHeader ctaHref="/marketplace" ctaLabel="Back to marketplace" />
        <main className="py-14 sm:py-18">
          <Container>
            <Card className="p-6 sm:p-8">
              <div className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                Listing not found
              </div>
              <p className="mt-3 max-w-2xl text-base leading-7 text-zinc-600 dark:text-zinc-300">
                This handle is not currently listed for sale. You can go back to the live
                marketplace or open the public payment page instead.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <ButtonLink href="/marketplace">Back to marketplace</ButtonLink>
                <ButtonLink href="/" variant="secondary">
                  Home
                </ButtonLink>
              </div>
            </Card>
          </Container>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      <AppPageHeader ctaHref="/marketplace" ctaLabel="Back to marketplace" />

      <main className="py-14 sm:py-18">
        <Container className="space-y-8">
          <SectionHeader
            eyebrow="Marketplace listing"
            title={`\u20A6${detail.listing.handle}`}
            description="Handle ownership can transfer, but trust history does not automatically move with the string. Accepted deals enter review before transfer."
          />

          <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <Card className="p-6 sm:p-7">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="orange">{detail.listing.saleMode.replace("_", " ")}</Badge>
                <Badge tone={detail.listing.status === "active" ? "verify" : "neutral"}>
                  {detail.listing.status.replace("_", " ")}
                </Badge>
                <Badge tone="neutral">
                  {detail.listing.commissionBps / 100}% marketplace commission
                </Badge>
                {detail.transfer ? (
                  <Badge tone={detail.transfer.status === "pending_review" ? "orange" : "verify"}>
                    transfer {detail.transfer.status.replace("_", " ")}
                  </Badge>
                ) : null}
              </div>

              <HandleIdentity
                handle={detail.listing.handle}
                verification={detail.claim.verification}
                className="mt-5"
              />

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <div className="rounded-[1.5rem] border border-zinc-200/70 bg-zinc-50/80 p-4 dark:border-zinc-800/80 dark:bg-zinc-900/40">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                    Ask
                  </div>
                  <div className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                    {formatCurrency(detail.listing.askAmount)}
                  </div>
                </div>
                <div className="rounded-[1.5rem] border border-zinc-200/70 bg-zinc-50/80 p-4 dark:border-zinc-800/80 dark:bg-zinc-900/40">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                    Highest live offer
                  </div>
                  <div className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                    {formatCurrency(detail.highestOfferAmount)}
                  </div>
                </div>
                <div className="rounded-[1.5rem] border border-zinc-200/70 bg-zinc-50/80 p-4 dark:border-zinc-800/80 dark:bg-zinc-900/40">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                    Pending offers
                  </div>
                  <div className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                    {detail.pendingOfferCount}
                  </div>
                </div>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-[1.5rem] border border-zinc-200/70 bg-zinc-50/80 p-5 dark:border-zinc-800/80 dark:bg-zinc-900/40">
                  <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                    Provenance
                  </div>
                  <div className="mt-3 space-y-2 text-sm text-zinc-600 dark:text-zinc-300">
                    <p>Owner: {detail.claim.displayName}</p>
                    <p>Owned since: {new Date(detail.ownerSinceAt).toLocaleDateString()}</p>
                    <p>Ownership age: {detail.ownerSinceDays} day(s)</p>
                    <p>Payout ready: {detail.bankLinked ? "Yes" : "No"}</p>
                  </div>
                </div>

                <div className="rounded-[1.5rem] border border-zinc-200/70 bg-zinc-50/80 p-5 dark:border-zinc-800/80 dark:bg-zinc-900/40">
                  <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                    Trust snapshot
                  </div>
                  <div className="mt-3 space-y-2 text-sm text-zinc-600 dark:text-zinc-300">
                    <p>Trust score: {detail.reputation?.trustScore ?? 12}/100</p>
                    <p>Settled volume: {formatCompactCurrency(detail.reputation?.totalVolume ?? 0)}</p>
                    <p>Transactions: {detail.reputation?.transactionCount ?? 0}</p>
                    <p>Badges: {(detail.reputation?.badges ?? []).join(", ") || "None yet"}</p>
                  </div>
                </div>
              </div>

              {detail.creditProfile ? (
                <div className="mt-5 rounded-[1.5rem] border border-zinc-200/70 bg-zinc-50/80 p-5 dark:border-zinc-800/80 dark:bg-zinc-900/40">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                        Phase 2 credit profile
                      </div>
                      <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                        Score {detail.creditProfile.score} · {detail.creditProfile.repaymentConfidence}% repayment confidence
                      </div>
                    </div>
                    <Badge tone={creditTone(detail.creditProfile.riskBand)}>
                      {detail.creditProfile.riskBand} risk
                    </Badge>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                        Limit
                      </div>
                      <div className="mt-1 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
                        {formatCompactCurrency(detail.creditProfile.recommendedLimit)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                        Active
                      </div>
                      <div className="mt-1 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
                        {detail.creditProfile.activeMonths} mo
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                        Settled
                      </div>
                      <div className="mt-1 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
                        {detail.creditProfile.settledTransactionCount}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {detail.listing.sellerNote ? (
                <div className="mt-5 rounded-[1.5rem] border border-zinc-200/70 bg-zinc-50/80 p-5 text-sm leading-7 text-zinc-600 dark:border-zinc-800/80 dark:bg-zinc-900/40 dark:text-zinc-300">
                  {detail.listing.sellerNote}
                </div>
              ) : null}

              <div className="mt-5 flex flex-wrap gap-3">
                <ButtonLink href={`/pay/${detail.listing.handle}`} variant="secondary">
                  Open pay page
                </ButtonLink>
                <ButtonLink href={`/h/${detail.listing.handle}`} variant="secondary">
                  Public profile
                </ButtonLink>
                <ButtonLink href="/marketplace" variant="secondary">
                  Browse other listings
                </ButtonLink>
              </div>
            </Card>

            <div className="space-y-5">
              <MarketplaceOfferForm
                handle={detail.listing.handle}
                saleMode={detail.listing.saleMode}
                askAmount={detail.listing.askAmount}
                minOfferAmount={detail.listing.minOfferAmount}
                disabled={detail.listing.status !== "active"}
              />

              {detail.transfer ? (
                <Card className="p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                        Transfer review
                      </div>
                      <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                        Accepted offer is tracked until review closes.
                      </div>
                    </div>
                    <Badge tone={detail.transfer.status === "pending_review" ? "orange" : "verify"}>
                      {detail.transfer.status.replace("_", " ")}
                    </Badge>
                  </div>
                  <div className="mt-4 space-y-2 text-sm text-zinc-600 dark:text-zinc-300">
                    <p>Buyer: {detail.transfer.buyerName}</p>
                    <p>Offer: {formatCurrency(detail.transfer.amount)}</p>
                    <p>Opened: {new Date(detail.transfer.createdAt).toLocaleString()}</p>
                  </div>
                </Card>
              ) : null}

              <Card className="p-5">
                <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                  Transfer rules
                </div>
                <div className="mt-3 space-y-3 text-sm leading-7 text-zinc-600 dark:text-zinc-300">
                  <p>Accepted offers move into review before any transfer happens.</p>
                  <p>Trust history stays with the verified owner and is recalculated after transfer.</p>
                  <p>Trademark, impersonation, and fraud checks can pause or cancel a transfer.</p>
                  <p>Final settlement should only happen after identity and payout checks are complete.</p>
                </div>
              </Card>

              <Card className="p-5">
                <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                  Recent handle activity
                </div>
                <div className="mt-4 space-y-3">
                  {detail.recentTransactions.length === 0 ? (
                    <div className="rounded-[1.4rem] border border-dashed border-zinc-300/70 px-4 py-5 text-sm text-zinc-600 dark:border-zinc-700/70 dark:text-zinc-300">
                      No payment history has been recorded on this handle yet.
                    </div>
                  ) : (
                    detail.recentTransactions.map((transaction) => (
                      <div
                        key={transaction.id}
                        className="rounded-[1.4rem] border border-zinc-200/70 bg-zinc-50/80 px-4 py-4 text-sm dark:border-zinc-800/80 dark:bg-zinc-900/40"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="font-medium text-zinc-950 dark:text-zinc-50">
                            {formatCurrency(transaction.amount)}
                          </div>
                          <Badge tone={transaction.status === "settled" ? "verify" : "neutral"}>
                            {transaction.status}
                          </Badge>
                        </div>
                        <div className="mt-2 text-zinc-600 dark:text-zinc-300">
                          {transaction.senderName || "Unknown sender"} · {new Date(transaction.recordedAt).toLocaleString()}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </div>
          </div>

          <SuggestedHandlesSection
            items={suggestions}
            mode="marketplace"
            title="Suggested handles nearby"
            description="Explore related live listings and high-trust handles before you leave the marketplace."
          />
        </Container>
      </main>
    </div>
  );
}
