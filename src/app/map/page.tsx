import { listClaims } from "@/lib/adminStore";
import { ClaimsMapView } from "@/components/nairatag/ClaimsMapView";

export const dynamic = "force-dynamic";

export default async function LiveMapPage() {
  const data = await listClaims({ limit: 24 });

  return <ClaimsMapView initialClaims={data.items} />;
}
