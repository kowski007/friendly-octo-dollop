import { listClaims } from "@/lib/adminStore";
import { MarketplaceView } from "@/components/nairatag/MarketplaceView";

export const dynamic = "force-dynamic";

type MarketplacePageProps = {
  searchParams: Promise<{ q?: string }>;
};

export default async function MarketplacePage({
  searchParams,
}: MarketplacePageProps) {
  const query = (await searchParams).q?.trim() || undefined;
  const data = await listClaims({ limit: 24, q: query });

  return <MarketplaceView claims={data.items} query={query} />;
}
