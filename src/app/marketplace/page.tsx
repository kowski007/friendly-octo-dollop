import {
  getAdminNameIndexSummary,
  getMarketplaceNames,
  getMarketplaceStats,
  listMarketplaceListings,
  listSuggestedHandles,
} from "@/lib/adminStore";
import type { NameIndexRecord } from "@/lib/nameIndex";
import { MarketplaceView } from "@/components/nairatag/MarketplaceView";

export const dynamic = "force-dynamic";

type MarketplacePageProps = {
  searchParams: Promise<{ q?: string; catalog?: string }>;
};

export default async function MarketplacePage({ searchParams }: MarketplacePageProps) {
  const params = await searchParams;
  const query = params.q?.trim() || undefined;
  const catalog =
    params.catalog === "premium" || params.catalog === "protected"
      ? params.catalog
      : "live";
  const [
    data,
    historyData,
    stats,
    suggestions,
    premiumNames,
    protectedNames,
    nameIndexSummary,
  ] = await Promise.all([
    listMarketplaceListings({ limit: 24, q: query }),
    listMarketplaceListings({
      limit: 40,
      q: query,
      statuses: ["active", "paused", "under_review", "withdrawn", "sold"],
    }),
    getMarketplaceStats(),
    listSuggestedHandles({ limit: 6, seed: query, preferListed: true }),
    getMarketplaceNames("premium", { q: query, limit: 60 }),
    getMarketplaceNames("protected", { q: query, limit: 60 }),
    getAdminNameIndexSummary(),
  ]);

  return (
    <MarketplaceView
      listings={data.items}
      historyListings={historyData.items}
      stats={stats}
      query={query}
      suggestions={suggestions}
      catalog={catalog}
      premiumNames={premiumNames.items as NameIndexRecord[]}
      protectedNames={protectedNames.items as NameIndexRecord[]}
      nameIndexSummary={nameIndexSummary}
    />
  );
}
