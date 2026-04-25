import {
  getMarketplaceStats,
  listMarketplaceListings,
  listSuggestedHandles,
} from "@/lib/adminStore";
import { MarketplaceView } from "@/components/nairatag/MarketplaceView";

export const dynamic = "force-dynamic";

type MarketplacePageProps = {
  searchParams: Promise<{ q?: string }>;
};

export default async function MarketplacePage({
  searchParams,
}: MarketplacePageProps) {
  const query = (await searchParams).q?.trim() || undefined;
  const [data, historyData, stats, suggestions] = await Promise.all([
    listMarketplaceListings({ limit: 24, q: query }),
    listMarketplaceListings({
      limit: 40,
      q: query,
      statuses: ["active", "paused", "under_review", "withdrawn", "sold"],
    }),
    getMarketplaceStats(),
    listSuggestedHandles({ limit: 6, seed: query, preferListed: true }),
  ]);

  return (
    <MarketplaceView
      listings={data.items}
      historyListings={historyData.items}
      stats={stats}
      query={query}
      suggestions={suggestions}
    />
  );
}
