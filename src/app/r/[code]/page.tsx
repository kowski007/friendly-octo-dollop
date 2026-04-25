import type { Metadata } from "next";

import { ReferralLandingView } from "@/components/nairatag/ReferralLandingView";
import { getPublicReferralShare } from "@/lib/adminStore";

export const dynamic = "force-dynamic";

type ReferralPageProps = {
  params: Promise<{ code: string }>;
};

export async function generateMetadata({
  params,
}: ReferralPageProps): Promise<Metadata> {
  const { code } = await params;
  const share = await getPublicReferralShare(code);

  if (!share) {
    return {
      title: "Referral invite",
      description: "Open NairaTag and claim your own ₦handle.",
    };
  }

  const title = share.referrerHandle
    ? `Join ${"\u20A6"}${share.referrerHandle} on NairaTag`
    : "Join NairaTag";
  const description = `${share.displayName} invited you to claim your own NairaTag ₦handle. Earned points are tracked automatically when you sign up and claim.`;
  const imageUrl = `/r/${share.code}/opengraph-image`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      images: [{ url: imageUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default async function ReferralPage({ params }: ReferralPageProps) {
  const { code } = await params;
  const share = await getPublicReferralShare(code);

  return <ReferralLandingView share={share} />;
}
