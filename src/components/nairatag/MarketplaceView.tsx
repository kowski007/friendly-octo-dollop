import type { MarketplaceListingView as ListingView, MarketplaceStats } from "@/lib/adminTypes";
import { AppPageHeader } from "./AppPageHeader";
import { Badge, ButtonLink, Card, Container, SectionHeader } from "./ui";
import { MarketplaceConsole } from "./MarketplaceConsole";

function formatCurrency(amount?: number | null) {
  if (amount == null) return "—";
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

function trustTone(score: number) {
  if (score >= 75) return "verify";
  if (score >= 50) return "orange";
  return "neutral";
}

export function MarketplaceView({
  listings,
  stats,
  query,
}: {
  listings: ListingView[];
  stats: MarketplaceStats;
  query?: string;
}) {
  return (
    <div className="min-h-screen bg-white text-zinc-950 transition-colors dark:bg-zinc-950 dark:text-zinc-50">
      <AppPageHeader ctaHref="/agent" ctaLabel="Claim a handle" />

      <main className="py-14 sm:py-18">
        <Container className="space-y-8">
          <SectionHeader
            eyebrow="Marketplace"
            title="Buy, list, and review handle transfers under live marketplace rules."
            description="Only real listings appear here. Sellers must own the handle, have payout setup, and pass listing checks. Trust history stays tied to the verified owner and does not automatically transfer with the string."
          />

          <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <Card className="p-6 sm:p-7">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="orange">Live listings only</Badge>
                <Badge tone="verify">Transfer review required</Badge>
                <Badge tone="neutral">Trust remains owner-bound</Badge>
              </div>

              <div className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-5xl">
                Turn scarce handles into reviewed marketplace inventory.
              </div>

              <div className="mt-4 max-w-2xl text-base leading-7 text-zinc-600 dark:text-zinc-300">
                Browse listed handles, inspect provenance, and submit real offers. Accepted
                deals move into review before any ownership change happens.
              </div>

              <form className="mt-6 flex flex-col gap-3 sm:flex-row">
                <input
                  type="search"
                  name="q"
                  defaultValue={query}
                  placeholder="Search ₦victor, ₦shop, ₦mama_ijebu"
                  className="w-full rounded-full border border-zinc-200/70 bg-white/85 px-5 py-3 text-sm font-medium text-zinc-950 shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-orange-200 dark:border-zinc-800/80 dark:bg-zinc-950/45 dark:text-zinc-50 dark:focus-visible:ring-orange-900/60"
                />
                <button
                  type="submit"
                  className="rounded-full bg-nt-orange px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-110"
                >
                  Search
                </button>
              </form>

              <div className="mt-6 flex flex-wrap gap-3">
                <ButtonLink href="/map" variant="secondary">
                  Watch network demand
                </ButtonLink>
                <ButtonLink href="/pay" variant="secondary">
                  Open pay links
                </ButtonLink>
              </div>
            </Card>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
              <Card className="p-6">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                  Live listings
                </div>
                <div className="mt-3 text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                  {stats.liveListings.toLocaleString()}
                </div>
                <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                  Public listings accepting real offers right now.
                </div>
              </Card>

              <Card className="p-6">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                  Pending offers
                </div>
                <div className="mt-3 text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                  {stats.pendingOffers.toLocaleString()}
                </div>
                <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                  Buyer demand waiting for seller review.
                </div>
              </Card>

              <Card className="p-6">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                  Average ask
                </div>
                <div className="mt-3 text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                  {formatCurrency(stats.averageAskAmount)}
                </div>
                <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                  Across currently priced listings.
                </div>
              </Card>

              <Card className="p-6">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                  Average offer
                </div>
                <div className="mt-3 text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                  {formatCurrency(stats.averageOfferAmount)}
                </div>
                <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                  Current offer flow through the marketplace.
                </div>
              </Card>
            </div>
          </div>

          <MarketplaceConsole />

          <Card className="p-6 sm:p-7">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                  Live inventory
                </div>
                <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                  Every card below comes from a live seller-created listing backed by marketplace rules.
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge tone="verify">{stats.liveListings} live</Badge>
                <Badge tone="neutral">{stats.underReviewListings} under review</Badge>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {listings.length === 0 ? (
                <div className="col-span-full rounded-[2rem] border border-dashed border-zinc-300/70 px-6 py-10 text-sm text-zinc-600 dark:border-zinc-700/70 dark:text-zinc-300">
                  No live listings yet. The first eligible seller can open the market from the seller console above.
                </div>
              ) : (
                listings.map((entry) => {
                  const trustScore = entry.reputation?.trustScore ?? 12;

                  return (
                    <Card
                      key={entry.listing.id}
                      className="rounded-[2rem] border-zinc-200/70 p-5 dark:border-zinc-800/70"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                            ₦{entry.listing.handle}
                          </div>
                          <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                            {entry.claim.displayName}
                          </div>
                        </div>
                        <Badge tone={trustTone(trustScore)}>Trust {trustScore}/100</Badge>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <Badge tone={entry.listing.status === "active" ? "verify" : "neutral"}>
                          {entry.listing.status.replace("_", " ")}
                        </Badge>
                        <Badge tone="orange">
                          {entry.listing.saleMode === "fixed_price" ? "Fixed price" : "Offers only"}
                        </Badge>
                        <Badge tone="neutral">{entry.bankLinked ? "Payout ready" : "No payout"}</Badge>
                      </div>

                      <div className="mt-5 grid grid-cols-3 gap-3">
                        <div className="rounded-[1.25rem] border border-zinc-200/70 bg-zinc-50/80 px-3 py-3 dark:border-zinc-800/80 dark:bg-zinc-900/35">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                            Ask
                          </div>
                          <div className="mt-2 text-lg font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                            {entry.listing.askAmount
                              ? formatCompactCurrency(entry.listing.askAmount)
                              : "Offers"}
                          </div>
                        </div>
                        <div className="rounded-[1.25rem] border border-zinc-200/70 bg-zinc-50/80 px-3 py-3 dark:border-zinc-800/80 dark:bg-zinc-900/35">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                            Offers
                          </div>
                          <div className="mt-2 text-lg font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                            {entry.pendingOfferCount}
                          </div>
                        </div>
                        <div className="rounded-[1.25rem] border border-zinc-200/70 bg-zinc-50/80 px-3 py-3 dark:border-zinc-800/80 dark:bg-zinc-900/35">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                            Volume
                          </div>
                          <div className="mt-2 text-lg font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                            {formatCompactCurrency(entry.reputation?.totalVolume ?? 0)}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 text-sm leading-7 text-zinc-600 dark:text-zinc-300">
                        Owned since {new Date(entry.ownerSinceAt).toLocaleDateString()} · {entry.offerCount} total offer(s)
                        {entry.listing.sellerNote ? ` · ${entry.listing.sellerNote}` : ""}
                      </div>

                      <div className="mt-5 flex flex-wrap gap-3">
                        <ButtonLink href={`/marketplace/${entry.listing.handle}`}>
                          View listing
                        </ButtonLink>
                        <ButtonLink href={`/pay/${entry.listing.handle}`} variant="secondary">
                          Open pay page
                        </ButtonLink>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          </Card>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card className="p-6 sm:p-7">
              <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                Seller policy
              </div>
              <div className="mt-4 space-y-3 text-sm leading-7 text-zinc-600 dark:text-zinc-300">
                <p>Sellers must own the handle and have payout setup before listing.</p>
                <p>Reserved short handles stay out of self-serve listings and are handled separately.</p>
                <p>Accepted offers move into review before any transfer or settlement.</p>
                <p>Misleading brand claims or impersonation can cancel a listing immediately.</p>
              </div>
            </Card>

            <Card className="p-6 sm:p-7">
              <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                Buyer protection
              </div>
              <div className="mt-4 space-y-3 text-sm leading-7 text-zinc-600 dark:text-zinc-300">
                <p>Trust history belongs to the verified owner, not the raw string alone.</p>
                <p>Listing provenance stays visible so buyers can inspect handle history before offering.</p>
                <p>Transfer review is required before a sale can complete.</p>
                <p>The public pay page and trust score remain visible during negotiation.</p>
              </div>
            </Card>
          </div>
        </Container>
      </main>
    </div>
  );
}
