import { getMarketplaceListingByHandle } from "@/lib/adminStore";
import { MarketplaceListingDetailView } from "@/components/nairatag/MarketplaceListingDetailView";

export const dynamic = "force-dynamic";

type MarketplaceListingPageProps = {
  params: Promise<{ handle: string }>;
};

export default async function MarketplaceListingPage({
  params,
}: MarketplaceListingPageProps) {
  const { handle } = await params;
  const detail = await getMarketplaceListingByHandle(handle);

  return <MarketplaceListingDetailView detail={detail} />;
}
