import {
  getMarketplaceListingByHandle,
  listSuggestedHandles,
} from "@/lib/adminStore";
import { MarketplaceListingDetailView } from "@/components/nairatag/MarketplaceListingDetailView";

export const dynamic = "force-dynamic";

type MarketplaceListingPageProps = {
  params: Promise<{ handle: string }>;
};

export default async function MarketplaceListingPage({
  params,
}: MarketplaceListingPageProps) {
  const { handle } = await params;
  const [detail, suggestions] = await Promise.all([
    getMarketplaceListingByHandle(handle),
    listSuggestedHandles({ limit: 6, seed: handle, preferListed: true }),
  ]);

  return <MarketplaceListingDetailView detail={detail} suggestions={suggestions} />;
}
