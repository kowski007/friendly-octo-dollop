import { notFound } from "next/navigation";

import { SavedPaylinkCheckoutView } from "@/components/nairatag/SavedPaylinkCheckoutView";
import { getPublicPaylinkByShortCode } from "@/lib/paylinks";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ handle: string; slug: string }>;
};

export default async function PaylinkSlugPage({ params }: PageProps) {
  const { handle, slug } = await params;
  const shortCode = `${handle.replace(/^\u20A6/u, "")}/${slug}`;
  const record = await getPublicPaylinkByShortCode(shortCode).catch(() => null);

  if (!record) {
    notFound();
  }

  return <SavedPaylinkCheckoutView paylink={record.publicView} />;
}
