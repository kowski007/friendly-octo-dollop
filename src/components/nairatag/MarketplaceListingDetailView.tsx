import type { MarketplaceListingDetail } from "@/lib/adminTypes";
import { AppPageHeader } from "./AppPageHeader";
import { Badge, ButtonLink, Card, Container, SectionHeader } from "./ui";
import { MarketplaceOfferForm } from "./MarketplaceOfferForm";

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

export function MarketplaceListingDetailView({
  detail,
}: {
  detail: MarketplaceListingDetail | null;
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
            title={`₦${detail.listing.handle}`}
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
              </div>

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

              {detail.listing.sellerNote ? (
                <div className="mt-5 rounded-[1.5rem] border border-zinc-200/70 bg-zinc-50/80 p-5 text-sm leading-7 text-zinc-600 dark:border-zinc-800/80 dark:bg-zinc-900/40 dark:text-zinc-300">
                  {detail.listing.sellerNote}
                </div>
              ) : null}

              <div className="mt-5 flex flex-wrap gap-3">
                <ButtonLink href={`/pay/${detail.listing.handle}`} variant="secondary">
                  Open pay page
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
        </Container>
      </main>
    </div>
  );
}
