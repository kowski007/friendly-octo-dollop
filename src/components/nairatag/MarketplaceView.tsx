import type { ClaimRecord } from "@/lib/adminTypes";
import { AppPageHeader } from "./AppPageHeader";
import {
  Badge,
  ButtonLink,
  Card,
  Container,
  NairaTermBadge,
  SectionHeader,
} from "./ui";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

function handleTier(handle: string) {
  if (handle.length <= 4) return "Ultra short";
  if (handle.length <= 6) return "Premium";
  if (handle.includes("_")) return "Merchant-style";
  return "Standard";
}

function indicativePrice(claim: ClaimRecord) {
  const lengthBoost = Math.max(0, 8 - claim.handle.length) * 60000;
  const verificationBoost =
    claim.verification === "business"
      ? 220000
      : claim.verification === "verified"
        ? 120000
        : 0;
  const base = 85000 + lengthBoost + verificationBoost;
  return Math.round(base / 5000) * 5000;
}

function statusLabel(claim: ClaimRecord) {
  return claim.verification === "pending" ? "Private offer" : "Broker-ready";
}

function typeLabel(claim: ClaimRecord) {
  return claim.verification === "business" ? "Business" : "Personal";
}

export function MarketplaceView({
  claims,
  query,
}: {
  claims: ClaimRecord[];
  query?: string;
}) {
  const featured = claims.slice(0, 9);
  const shortest = [...claims].sort((a, b) => a.handle.length - b.handle.length)[0];
  const verifiedCount = claims.filter(
    (claim) => claim.verification === "verified" || claim.verification === "business"
  ).length;

  return (
    <div className="min-h-screen bg-white text-zinc-950 transition-colors dark:bg-zinc-950 dark:text-zinc-50">
      <AppPageHeader ctaHref="/agent" ctaLabel="List a handle" />

      <main className="py-14 sm:py-18">
        <Container className="space-y-8">
          <SectionHeader
            eyebrow="Marketplace beta"
            title="Discover premium handles before the transfer rails open fully."
            description="This is the secondary market surface for reserved identities. We are starting with discovery, indicative pricing, and brokered transfer workflows before full self-serve buying and selling goes live."
          />

          <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <Card className="p-6 sm:p-7">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="orange">Buying and selling</Badge>
                <Badge tone="verify">Transfer-safe beta</Badge>
              </div>

              <div className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-5xl">
                The future exchange for identity-native handles.
              </div>

              <div className="mt-4 max-w-2xl text-base leading-7 text-zinc-600 dark:text-zinc-300">
                Search premium <NairaTermBadge term="handles" tone="orange" /> ,
                assess scarcity, and route serious acquisition interest into a
                brokered transfer flow while the trust and payout rails mature.
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
                  Watch live demand
                </ButtonLink>
                <ButtonLink href="/agent">Start seller flow</ButtonLink>
              </div>
            </Card>

            <div className="grid gap-5 sm:grid-cols-3 lg:grid-cols-1">
              <Card className="p-6">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                  Claimed handles
                </div>
                <div className="mt-3 text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                  {claims.length.toLocaleString()}
                </div>
                <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                  Handles already inside the network.
                </div>
              </Card>

              <Card className="p-6">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                  Verified identities
                </div>
                <div className="mt-3 text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                  {verifiedCount.toLocaleString()}
                </div>
                <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                  Higher-trust handles ready for safer transfers.
                </div>
              </Card>

              <Card className="p-6">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                  Shortest live handle
                </div>
                <div className="mt-3 text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                  {shortest ? `₦${shortest.handle}` : "—"}
                </div>
                <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                  Rare handles will command the earliest demand.
                </div>
              </Card>
            </div>
          </div>

          <Card className="p-6 sm:p-7">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                  Featured handle inventory
                </div>
                <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                  Discovery-first for now: pricing is indicative, transfer execution is brokered, and final ownership checks still happen inside NairaTag.
                </div>
              </div>
              <Badge tone="neutral">
                {query?.trim() ? `Filtered by “${query.trim()}”` : "Live claimed feed"}
              </Badge>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {featured.length === 0 ? (
                <div className="col-span-full rounded-[2rem] border border-dashed border-zinc-300/70 px-6 py-10 text-sm text-zinc-600 dark:border-zinc-700/70 dark:text-zinc-300">
                  No handles matched this filter yet. Try another search term or claim a fresh handle first.
                </div>
              ) : (
                featured.map((claim) => (
                  <Card
                    key={claim.id}
                    className="rounded-[2rem] border-zinc-200/70 p-5 dark:border-zinc-800/70"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                          ₦{claim.handle}
                        </div>
                        <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                          {claim.displayName}
                        </div>
                      </div>
                      <Badge tone={claim.verification === "pending" ? "neutral" : "verify"}>
                        {statusLabel(claim)}
                      </Badge>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2">
                      <Badge tone="orange">{handleTier(claim.handle)}</Badge>
                      <Badge tone="neutral">{typeLabel(claim)}</Badge>
                      <Badge tone="neutral">{claim.bank}</Badge>
                    </div>

                    <div className="mt-5 rounded-[1.5rem] border border-zinc-200/70 bg-zinc-50/80 p-4 dark:border-zinc-800/80 dark:bg-zinc-900/45">
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                        Indicative market value
                      </div>
                      <div className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                        {formatCurrency(indicativePrice(claim))}
                      </div>
                      <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                        Based on rarity, length, identity strength, and transfer readiness.
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3">
                      <ButtonLink href={`/pay/${claim.handle}`} variant="secondary">
                        Open pay link
                      </ButtonLink>
                      <ButtonLink href={`/agent?prompt=list%20%E2%82%A6${claim.handle}`}>
                        Broker this handle
                      </ButtonLink>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </Card>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card className="p-6 sm:p-7">
              <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                Seller onboarding
              </div>
              <div className="mt-4 space-y-3 text-sm leading-7 text-zinc-600 dark:text-zinc-300">
                <p>1. Verify the identity behind the handle.</p>
                <p>2. Confirm payout destination and ownership history.</p>
                <p>3. List the handle with a private floor or broker-assist mode.</p>
                <p>4. Complete transfer only after recipient and seller clear compliance checks.</p>
              </div>
              <div className="mt-5">
                <ButtonLink href="/agent">Join seller beta</ButtonLink>
              </div>
            </Card>

            <Card className="p-6 sm:p-7">
              <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                What unlocks the full marketplace
              </div>
              <div className="mt-4 space-y-3 text-sm leading-7 text-zinc-600 dark:text-zinc-300">
                <p>Ownership transfer rails and settlement escrow</p>
                <p>Identity-aware dispute handling</p>
                <p>Verified payment links that survive platform boundaries</p>
                <p>Buyer reputation and demand signals from the live network</p>
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <ButtonLink href="/map" variant="secondary">
                  View demand map
                </ButtonLink>
                <ButtonLink href="/">Back to product</ButtonLink>
              </div>
            </Card>
          </div>
        </Container>
      </main>
    </div>
  );
}
