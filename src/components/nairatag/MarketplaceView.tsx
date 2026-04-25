import type {
  PublicHandleSuggestion,
  MarketplaceListingView as ListingView,
  MarketplaceStats,
} from "@/lib/adminTypes";

import { AppPageHeader } from "./AppPageHeader";
import { Badge, ButtonLink, Container, cn } from "./ui";
import { SuggestedHandlesSection } from "./HandleTrust";
import { MarketplaceConsole } from "./MarketplaceConsole";

const NAIRA = "\u20A6";

type CategoryRow = {
  rank: number;
  title: string;
  floor: number | null;
  volume: number;
  count: number;
  mark: string;
  tileClassName: string;
};

type HistoryRow = {
  id: string;
  label: string;
  detail: string;
  tone: "neutral" | "verify" | "orange";
  at: string;
  entry: ListingView;
};

function formatCurrency(amount?: number | null) {
  if (amount == null) return "-";
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    currencyDisplay: "code",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatCompactCurrency(amount?: number | null) {
  if (amount == null) return "-";
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    currencyDisplay: "code",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount);
}

function trustTone(score: number) {
  if (score >= 75) return "verify";
  if (score >= 50) return "orange";
  return "neutral";
}

function ageLabel(days: number) {
  if (days <= 0) return "today";
  if (days === 1) return "1 day";
  if (days < 30) return `${days} days`;
  const months = Math.floor(days / 30);
  if (months === 1) return "1 month";
  if (months < 12) return `${months} months`;
  const years = Math.floor(months / 12);
  return years === 1 ? "1 year" : `${years} years`;
}

function shortOwnerId(entry: ListingView) {
  const raw = entry.claim.userId ?? entry.listing.sellerUserId;
  if (!raw) return "-";
  if (raw.length <= 12) return raw;
  return `${raw.slice(0, 6)}...${raw.slice(-4)}`;
}

function listingSortValue(entry: ListingView) {
  return (
    entry.listing.askAmount ??
    entry.highestOfferAmount ??
    entry.listing.minOfferAmount ??
    0
  );
}

function floorFor(entries: ListingView[]) {
  const values = entries.map(listingSortValue).filter((value) => value > 0);
  return values.length > 0 ? Math.min(...values) : null;
}

function volumeFor(entries: ListingView[]) {
  return entries.reduce(
    (sum, entry) =>
      sum +
      (entry.reputation?.totalVolume ??
        entry.listing.askAmount ??
        entry.highestOfferAmount ??
        0),
    0
  );
}

function changeLabel(value: number) {
  return `${value >= 0 ? "+" : ""}${value}%`;
}

function formatHistoryTime(value: string) {
  return new Date(value).toLocaleString("en-NG", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function historyMoment(entry: ListingView) {
  return (
    entry.listing.reviewStartedAt ??
    entry.listing.withdrawnAt ??
    entry.listing.updatedAt ??
    entry.listing.publishedAt
  );
}

function buildHistoryRow(entry: ListingView): HistoryRow {
  const at = historyMoment(entry);

  if (entry.listing.status === "under_review") {
    return {
      id: `${entry.listing.id}:review`,
      label: "Transfer review",
      detail:
        entry.highestOfferAmount != null
          ? `Accepted offer near ${formatCurrency(entry.highestOfferAmount)}`
          : "Accepted offer awaiting approval",
      tone: "orange",
      at,
      entry,
    };
  }

  if (entry.listing.status === "sold") {
    return {
      id: `${entry.listing.id}:sold`,
      label: "Transfer completed",
      detail: "Ownership transfer cleared through marketplace review.",
      tone: "verify",
      at,
      entry,
    };
  }

  if (entry.listing.status === "withdrawn") {
    return {
      id: `${entry.listing.id}:withdrawn`,
      label: "Listing withdrawn",
      detail: "Seller removed the handle from the live market.",
      tone: "neutral",
      at,
      entry,
    };
  }

  if (entry.listing.status === "paused") {
    return {
      id: `${entry.listing.id}:paused`,
      label: "Listing paused",
      detail: "Seller paused buyer access while keeping the listing draft.",
      tone: "neutral",
      at,
      entry,
    };
  }

  if (entry.pendingOfferCount > 0) {
    return {
      id: `${entry.listing.id}:offers`,
      label: "Offer activity",
      detail:
        entry.highestOfferAmount != null
          ? `${entry.pendingOfferCount} pending offer(s), best bid ${formatCurrency(entry.highestOfferAmount)}`
          : `${entry.pendingOfferCount} pending offer(s)`,
      tone: "verify",
      at,
      entry,
    };
  }

  return {
    id: `${entry.listing.id}:listed`,
    label: "Listing published",
    detail:
      entry.listing.saleMode === "fixed_price"
        ? `Opened at ${formatCurrency(entry.listing.askAmount)}`
        : "Opened for offers",
    tone: "neutral",
    at,
    entry,
  };
}

function CategoryTile({ category }: { category: CategoryRow }) {
  return (
    <div className="relative grid grid-cols-[6rem_minmax(0,1fr)_auto] items-center gap-5">
      <div className="relative h-24 w-24 rounded-3xl bg-zinc-900 p-4 shadow-sm dark:bg-black">
        <div className="absolute -left-3 -top-2 grid h-9 w-9 place-items-center rounded-full bg-white text-sm font-semibold text-zinc-950 shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-900 dark:text-zinc-50 dark:ring-zinc-800">
          {category.rank}
        </div>
        <div
          className={cn(
            "grid h-full w-full place-items-center rounded-xl text-2xl font-semibold text-white",
            category.tileClassName
          )}
        >
          {category.mark}
        </div>
      </div>
      <div className="min-w-0">
        <div className="truncate text-xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          {category.title}
        </div>
        <div className="mt-1 text-sm font-medium text-zinc-500 dark:text-zinc-400">
          Floor: {formatCurrency(category.floor)}
        </div>
      </div>
      <div className="text-right">
        <div className="text-lg font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          {formatCompactCurrency(category.volume)}
        </div>
        <div className="mt-1 text-sm font-medium text-zinc-500 dark:text-zinc-400">
          {category.count.toLocaleString()} handles
        </div>
      </div>
    </div>
  );
}

export function MarketplaceView({
  listings,
  historyListings,
  stats,
  query,
  suggestions,
}: {
  listings: ListingView[];
  historyListings?: ListingView[];
  stats: MarketplaceStats;
  query?: string;
  suggestions: PublicHandleSuggestion[];
}) {
  const sortedListings = [...listings].sort(
    (a, b) => listingSortValue(b) - listingSortValue(a)
  );
  const sortedHistoryListings = [...(historyListings ?? listings)].sort(
    (a, b) => Date.parse(historyMoment(b)) - Date.parse(historyMoment(a))
  );
  const bestOffer = sortedListings.reduce<number | null>((best, entry) => {
    const amount = entry.highestOfferAmount;
    if (amount == null) return best;
    return best == null ? amount : Math.max(best, amount);
  }, null);

  const shortHandles = sortedListings.filter(
    (entry) => entry.listing.handle.length <= 5
  );
  const midHandles = sortedListings.filter(
    (entry) =>
      entry.listing.handle.length > 5 && entry.listing.handle.length <= 8
  );
  const longHandles = sortedListings.filter(
    (entry) => entry.listing.handle.length > 8
  );
  const highTrust = sortedListings.filter(
    (entry) => (entry.reputation?.trustScore ?? 0) >= 70
  );
  const fixedPrice = sortedListings.filter(
    (entry) => entry.listing.saleMode === "fixed_price"
  );
  const offersOnly = sortedListings.filter(
    (entry) => entry.listing.saleMode === "offers_only"
  );
  const payoutReady = sortedListings.filter((entry) => entry.bankLinked);
  const newOwners = sortedListings.filter((entry) => entry.ownerSinceDays <= 30);
  const listedVolume = volumeFor(sortedListings);
  const historyRows = sortedHistoryListings.slice(0, 12).map(buildHistoryRow);
  const latestHistoryTimestamp = sortedHistoryListings.reduce(
    (latest, entry) => Math.max(latest, Date.parse(historyMoment(entry)) || 0),
    0
  );
  const recentHistoryCount = sortedHistoryListings.filter(
    (entry) =>
      latestHistoryTimestamp > 0 &&
      latestHistoryTimestamp - Date.parse(historyMoment(entry)) <=
        7 * 24 * 60 * 60 * 1000
  ).length;
  const reviewCount = sortedHistoryListings.filter(
    (entry) => entry.listing.status === "under_review"
  ).length;
  const soldCount = sortedHistoryListings.filter(
    (entry) => entry.listing.status === "sold"
  ).length;
  const withdrawnCount = sortedHistoryListings.filter(
    (entry) => entry.listing.status === "withdrawn"
  ).length;

  const categoryRows: CategoryRow[] = [
    {
      title: "Short handles",
      floor: floorFor(shortHandles),
      volume: volumeFor(shortHandles),
      count: shortHandles.length,
      mark: "SH",
      tileClassName: "bg-pink-500",
    },
    {
      title: "Fixed price",
      floor: floorFor(fixedPrice),
      volume: volumeFor(fixedPrice),
      count: fixedPrice.length,
      mark: "FX",
      tileClassName: "bg-emerald-600",
    },
    {
      title: "High trust",
      floor: floorFor(highTrust),
      volume: volumeFor(highTrust),
      count: highTrust.length,
      mark: "HT",
      tileClassName: "bg-cyan-600",
    },
    {
      title: "Offers only",
      floor: floorFor(offersOnly),
      volume: volumeFor(offersOnly),
      count: offersOnly.length,
      mark: "OF",
      tileClassName: "bg-violet-600",
    },
    {
      title: "6-8 letters",
      floor: floorFor(midHandles),
      volume: volumeFor(midHandles),
      count: midHandles.length,
      mark: "68",
      tileClassName: "bg-indigo-500",
    },
    {
      title: "Long names",
      floor: floorFor(longHandles),
      volume: volumeFor(longHandles),
      count: longHandles.length,
      mark: "LN",
      tileClassName: "bg-sky-500",
    },
    {
      title: "Payout ready",
      floor: floorFor(payoutReady),
      volume: volumeFor(payoutReady),
      count: payoutReady.length,
      mark: "PY",
      tileClassName: "bg-lime-600",
    },
    {
      title: "New owners",
      floor: floorFor(newOwners),
      volume: volumeFor(newOwners),
      count: newOwners.length,
      mark: "NW",
      tileClassName: "bg-rose-500",
    },
  ]
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return b.volume - a.volume;
    })
    .map((category, index) => ({
      ...category,
      rank: index + 1,
    }));

  const offerRows = sortedListings
    .filter(
      (entry) =>
        entry.highestOfferAmount != null ||
        entry.listing.minOfferAmount != null ||
        entry.listing.askAmount != null
    )
    .slice(0, 10);

  return (
    <div className="min-h-screen bg-white text-zinc-950 transition-colors dark:bg-zinc-950 dark:text-zinc-50">
      <AppPageHeader ctaHref="/claim" ctaLabel="Claim a ₦handle" />

      <main className="pb-14 pt-4 sm:pb-20">
        <Container className="max-w-[96rem] space-y-8">
          <div className="border-b border-zinc-200 dark:border-zinc-800">
            <nav
              aria-label="Marketplace sections"
              className="flex gap-7 overflow-x-auto text-sm font-semibold text-zinc-500 dark:text-zinc-400"
            >
              {[
                ["Categories", "#categories"],
                ["Collection", "#collection"],
                ["History", "#history"],
                ["Stats", "#stats"],
                ["Offers", "#offers"],
                ["More", "#seller-console"],
              ].map(([label, href]) => (
                <a
                  key={label}
                  href={href}
                  className={cn(
                    "whitespace-nowrap border-b-2 border-transparent pb-4 transition hover:text-zinc-950 dark:hover:text-zinc-50",
                    label === "Collection" &&
                      "border-zinc-950 text-zinc-950 dark:border-zinc-50 dark:text-zinc-50"
                  )}
                >
                  {label}
                </a>
              ))}
            </nav>
          </div>

          <section id="categories" className="space-y-7">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                  Live categories
                </h1>
                <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                  Ranked by real live listing counts, then by visible marketplace volume.
                </p>
              </div>
              <Badge tone="neutral">
                {stats.liveListings.toLocaleString()} live listing{stats.liveListings === 1 ? "" : "s"}
              </Badge>
            </div>

            <div className="grid gap-x-16 gap-y-8 lg:grid-cols-2 2xl:grid-cols-3">
              {categoryRows.map((category) => (
                <CategoryTile key={category.rank} category={category} />
              ))}
            </div>
          </section>

          <section id="collection" className="space-y-5">
            <SuggestedHandlesSection
              items={suggestions}
              mode="marketplace"
              title={query ? "Suggested handles for this search" : "Suggested handles"}
              description={
                query
                  ? "These handles are the closest live or high-trust matches for what you searched."
                  : "A tighter mix of live listings and trusted handles visitors can act on immediately."
              }
              emptyState="No suggested handles are available yet."
              className="rounded-[2rem] bg-zinc-50 p-5 dark:bg-zinc-900/45 sm:p-7"
            />

            <form className="grid gap-3 lg:grid-cols-[minmax(18rem,1fr)_auto] lg:items-center">
              <label className="relative block">
                <span
                  className="pointer-events-none absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full border-2 border-zinc-400"
                  aria-hidden="true"
                >
                  <span className="absolute -bottom-1 -right-1 h-1.5 w-0.5 rotate-[-45deg] rounded-full bg-zinc-400" />
                </span>
                <input
                  type="search"
                  name="q"
                  defaultValue={query}
                  placeholder="Name or description"
                  className="min-h-11 w-full rounded-2xl border-0 bg-zinc-100 py-3 pl-11 pr-4 text-sm font-medium text-zinc-950 outline-none transition placeholder:text-zinc-400 focus-visible:ring-2 focus-visible:ring-orange-200 dark:bg-zinc-900 dark:text-zinc-50 dark:focus-visible:ring-orange-900/60"
                />
              </label>
              <button
                type="submit"
                className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
              >
                Search live listings
              </button>
            </form>

            <div className="rounded-3xl bg-zinc-50 p-4 dark:bg-zinc-900/55 sm:flex sm:items-center sm:justify-between sm:gap-5">
              <div className="grid gap-1">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
                  Marketplace floor
                </div>
                <div className="text-xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                  {formatCurrency(stats.averageAskAmount)}
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">
                  Availability is checked live per handle search, not shown as a global count.
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:mt-0 sm:flex sm:items-center sm:gap-6">
                <div>
                  <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    Claimed
                  </div>
                  <div className="font-semibold text-zinc-950 dark:text-zinc-50">
                    {stats.totalClaims.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    Listed
                  </div>
                  <div className="font-semibold text-zinc-950 dark:text-zinc-50">
                    {stats.listedClaims.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    Off-market
                  </div>
                  <div className="font-semibold text-zinc-950 dark:text-zinc-50">
                    {stats.unlistedClaims.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    Reserved short
                  </div>
                  <div className="font-semibold text-zinc-950 dark:text-zinc-50">
                    {stats.reservedClaimedHandles.toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 sm:mt-0">
                <ButtonLink
                  href="#seller-console"
                  className="min-h-10 bg-blue-600 px-4 py-2 text-xs hover:bg-blue-500 hover:brightness-100"
                >
                  List handle now
                </ButtonLink>
                <ButtonLink
                  href="#offers"
                  variant="secondary"
                  className="min-h-10 px-4 py-2 text-xs"
                >
                  All offers
                </ButtonLink>
              </div>
            </div>

            <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
              <div className="overflow-x-auto">
                <table className="min-w-[1120px] w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-zinc-200 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                      <th className="w-[22%] px-6 py-4">Item</th>
                      <th className="w-[14%] px-6 py-4">Price</th>
                      <th className="w-[16%] px-6 py-4">Next bid</th>
                      <th className="w-[16%] px-6 py-4">Settled activity</th>
                      <th className="w-[16%] px-6 py-4">Owner</th>
                      <th className="w-[16%] px-6 py-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                    {sortedListings.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-6 py-14 text-center text-sm text-zinc-500 dark:text-zinc-400"
                        >
                          No live listings yet. Eligible sellers can open the
                          market from the management area below.
                        </td>
                      </tr>
                    ) : (
                      sortedListings.map((entry) => {
                        const trustScore = entry.reputation?.trustScore ?? 12;
                        const nextBid =
                          entry.highestOfferAmount ??
                          entry.listing.minOfferAmount ??
                          null;
                        const lastSale =
                          entry.reputation?.settledTransactionCount &&
                          entry.reputation.settledTransactionCount > 0
                            ? entry.reputation.totalVolume /
                              entry.reputation.settledTransactionCount
                            : null;

                        return (
                          <tr
                            key={entry.listing.id}
                            className="group text-sm transition hover:bg-zinc-50/80 dark:hover:bg-zinc-900/35"
                          >
                            <td className="px-6 py-5 align-middle">
                              <div className="flex min-w-0 items-center gap-3">
                                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-orange-50 text-sm font-semibold text-orange-700 dark:bg-orange-950/35 dark:text-orange-200">
                                  {NAIRA}
                                </div>
                                <div className="min-w-0">
                                  <a
                                    href={`/marketplace/${entry.listing.handle}`}
                                    className="block truncate text-base font-semibold tracking-tight text-zinc-950 hover:text-orange-600 dark:text-zinc-50 dark:hover:text-orange-300"
                                  >
                                    {NAIRA}
                                    {entry.listing.handle}
                                  </a>
                                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                                    <span>{ageLabel(entry.ownerSinceDays)}</span>
                                    <Badge
                                      tone={trustTone(trustScore)}
                                      className="px-2 py-0.5 text-[11px]"
                                    >
                                      Trust {trustScore}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-5 align-middle">
                              <div className="font-semibold text-zinc-950 dark:text-zinc-50">
                                {entry.listing.saleMode === "fixed_price"
                                  ? formatCurrency(entry.listing.askAmount)
                                  : "-"}
                              </div>
                              <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                {entry.listing.saleMode === "fixed_price"
                                  ? "Fixed price"
                                  : "Offers only"}
                              </div>
                            </td>
                            <td className="px-6 py-5 align-middle">
                              <div className="font-semibold text-zinc-950 dark:text-zinc-50">
                                {formatCurrency(nextBid)}
                              </div>
                              <a
                                href={`/marketplace/${entry.listing.handle}`}
                                className="mt-1 block text-xs font-semibold text-blue-600 hover:text-blue-500 dark:text-blue-400"
                              >
                                Place a bid
                              </a>
                            </td>
                            <td className="px-6 py-5 align-middle">
                              <div className="font-semibold text-zinc-950 dark:text-zinc-50">
                                {formatCurrency(lastSale)}
                              </div>
                              <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                {entry.reputation?.settledTransactionCount
                                  ? `${entry.reputation.settledTransactionCount} settled`
                                  : "No sale yet"}
                              </div>
                            </td>
                            <td className="px-6 py-5 align-middle">
                              <div className="font-mono text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                                {shortOwnerId(entry)}
                              </div>
                              <div className="mt-1 truncate text-xs text-zinc-500 dark:text-zinc-400">
                                {entry.claim.displayName}
                              </div>
                            </td>
                            <td className="px-6 py-5 text-right align-middle">
                              <div className="flex justify-end gap-2">
                                <a
                                  href={`/marketplace/${entry.listing.handle}`}
                                  className="inline-flex min-h-9 items-center justify-center rounded-full bg-zinc-950 px-4 text-xs font-semibold text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                                >
                                  View
                                </a>
                                <a
                                  href={`/h/${entry.listing.handle}`}
                                  className="inline-flex min-h-9 items-center justify-center rounded-full bg-zinc-100 px-4 text-xs font-semibold text-zinc-950 transition hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800"
                                >
                                  Profile
                                </a>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section
            id="stats"
            className="rounded-[2rem] bg-zinc-50 p-5 dark:bg-zinc-900/45 sm:p-7"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                  Stats
                </h2>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  Marketplace health across listings, offers, and transfer review.
                </p>
              </div>
              <Badge tone="neutral">Current registry snapshot</Badge>
            </div>

            <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[
                ["Claimed handles", stats.totalClaims.toLocaleString()],
                ["Verified claims", stats.verifiedClaims.toLocaleString()],
                ["Live listings", stats.liveListings.toLocaleString()],
                ["Listed volume", formatCompactCurrency(listedVolume)],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-3xl bg-white p-5 shadow-sm dark:bg-zinc-950/65"
                >
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
                    {label}
                  </div>
                  <div className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                    {value}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-3xl bg-white p-5 shadow-sm dark:bg-zinc-950/65">
                <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                  Category performance
                </div>
                <div className="mt-5 space-y-4">
                  {categoryRows.slice(0, 5).map((category) => (
                    <div
                      key={category.rank}
                      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-3 text-sm font-semibold">
                          <span>{category.title}</span>
                          <span>{formatCompactCurrency(category.volume)}</span>
                        </div>
                        <div className="mt-2 h-2 rounded-full bg-zinc-100 dark:bg-zinc-900">
                          <div
                            className="h-2 rounded-full bg-orange-500"
                            style={{
                              width: `${Math.max(
                                8,
                                Math.min(
                                  100,
                                  listedVolume > 0
                                    ? (category.volume / listedVolume) * 100
                                    : 8
                                )
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                      <div className="text-sm font-semibold text-zinc-600 dark:text-zinc-300">
                        {category.count.toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl bg-white p-5 shadow-sm dark:bg-zinc-950/65">
                <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                  Liquidity
                </div>
                <div className="mt-5 grid gap-4">
                  {[
                    ["Best bid", formatCurrency(bestOffer)],
                    ["Average offer", formatCurrency(stats.averageOfferAmount)],
                    ["Pending reviews", stats.pendingTransfers.toLocaleString()],
                    ["Reserved claimed", stats.reservedClaimedHandles.toLocaleString()],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="flex items-center justify-between border-b border-zinc-100 pb-3 text-sm last:border-b-0 last:pb-0 dark:border-zinc-900"
                    >
                      <span className="text-zinc-500 dark:text-zinc-400">
                        {label}
                      </span>
                      <span className="font-semibold">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section
            id="offers"
            className="overflow-hidden rounded-3xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
          >
            <div className="px-6 py-5">
              <h2 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                All offers
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-[980px] w-full border-collapse text-left">
                <thead>
                  <tr className="border-y border-zinc-200 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                    <th className="px-6 py-4">Price per handle</th>
                    <th className="px-6 py-4">Floor difference</th>
                    <th className="px-6 py-4">Handle size</th>
                    <th className="px-6 py-4">Offer flow</th>
                    <th className="px-6 py-4">Updated</th>
                    <th className="px-6 py-4">From</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                  {offerRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-6 py-10 text-center text-sm text-zinc-500 dark:text-zinc-400"
                      >
                        No marketplace offers are visible yet.
                      </td>
                    </tr>
                  ) : (
                    offerRows.map((entry) => {
                      const price =
                        entry.highestOfferAmount ??
                        entry.listing.minOfferAmount ??
                        entry.listing.askAmount ??
                        null;
                      const diff =
                        stats.averageAskAmount && price
                          ? Math.round(
                              ((price - stats.averageAskAmount) /
                                stats.averageAskAmount) *
                                100
                            )
                          : 0;

                      return (
                        <tr key={entry.listing.id} className="text-sm">
                          <td className="px-6 py-5 font-semibold text-zinc-950 dark:text-zinc-50">
                            {formatCurrency(price)}
                          </td>
                          <td
                            className={cn(
                              "px-6 py-5 font-medium",
                              diff >= 0 ? "text-emerald-600" : "text-rose-500"
                            )}
                          >
                            {changeLabel(diff)}
                          </td>
                          <td className="px-6 py-5">
                            {entry.listing.handle.length} chars
                          </td>
                          <td className="px-6 py-5">
                            {entry.pendingOfferCount}/{Math.max(1, entry.offerCount)}
                          </td>
                          <td className="px-6 py-5">
                            {formatHistoryTime(entry.listing.updatedAt)}
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-3">
                              <span className="grid h-8 w-8 place-items-center rounded-full bg-zinc-100 text-xs font-semibold dark:bg-zinc-900">
                                {entry.claim.displayName.slice(0, 1).toUpperCase()}
                              </span>
                              <span className="font-semibold text-blue-600 dark:text-blue-400">
                                {shortOwnerId(entry)}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-5 text-right">
                            <a
                              href={`/marketplace/${entry.listing.handle}`}
                              className="inline-flex min-h-10 items-center justify-center rounded-full bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-500"
                            >
                              Open
                            </a>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section
            id="history"
            className="rounded-[2rem] bg-zinc-50 p-5 dark:bg-zinc-900/45 sm:p-7"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                  History
                </h2>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  Listing lifecycle, offer pressure, and review movement across
                  the marketplace.
                </p>
              </div>
              <Badge tone="neutral">Latest activity window</Badge>
            </div>

            <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[
                ["Recent events", recentHistoryCount.toLocaleString()],
                ["In review", reviewCount.toLocaleString()],
                ["Sold", soldCount.toLocaleString()],
                ["Withdrawn", withdrawnCount.toLocaleString()],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-3xl bg-white p-5 shadow-sm dark:bg-zinc-950/65"
                >
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
                    {label}
                  </div>
                  <div className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                    {value}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 overflow-hidden rounded-3xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
              <div className="overflow-x-auto">
                <table className="min-w-[1080px] w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-zinc-200 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                      <th className="px-6 py-4">Event</th>
                      <th className="px-6 py-4">Handle</th>
                      <th className="px-6 py-4">Market</th>
                      <th className="px-6 py-4">Price / bid</th>
                      <th className="px-6 py-4">When</th>
                      <th className="px-6 py-4">Owner</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                    {historyRows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-6 py-10 text-center text-sm text-zinc-500 dark:text-zinc-400"
                        >
                          No marketplace history is visible yet.
                        </td>
                      </tr>
                    ) : (
                      historyRows.map((row) => (
                        <tr key={row.id} className="text-sm">
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-3">
                              <Badge
                                tone={row.tone}
                                className="px-2 py-0.5 text-[11px]"
                              >
                                {row.label}
                              </Badge>
                              <span className="text-zinc-500 dark:text-zinc-400">
                                {row.detail}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-5 font-semibold text-zinc-950 dark:text-zinc-50">
                            {NAIRA}
                            {row.entry.listing.handle}
                          </td>
                          <td className="px-6 py-5">
                            <div className="font-medium text-zinc-950 dark:text-zinc-50">
                              {row.entry.listing.status.replace("_", " ")}
                            </div>
                            <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                              {row.entry.listing.saleMode === "fixed_price"
                                ? "Fixed price"
                                : "Offers only"}
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <div className="font-semibold text-zinc-950 dark:text-zinc-50">
                              {formatCurrency(
                                row.entry.highestOfferAmount ??
                                  row.entry.listing.askAmount ??
                                  row.entry.listing.minOfferAmount
                              )}
                            </div>
                            <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                              {row.entry.pendingOfferCount} pending /{" "}
                              {row.entry.offerCount} total offers
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <div className="font-medium text-zinc-950 dark:text-zinc-50">
                              {formatHistoryTime(row.at)}
                            </div>
                            <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                              Held {ageLabel(row.entry.ownerSinceDays)}
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <div className="font-mono font-semibold text-zinc-950 dark:text-zinc-50">
                              {shortOwnerId(row.entry)}
                            </div>
                            <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                              {row.entry.claim.displayName}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section id="seller-console">
            <MarketplaceConsole />
          </section>
        </Container>
      </main>
    </div>
  );
}
