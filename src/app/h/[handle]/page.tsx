import type { Metadata } from "next";

import { getPublicHandleProfile, listSuggestedHandles } from "@/lib/adminStore";
import { PublicHandleProfileView } from "@/components/nairatag/PublicHandleProfileView";

export const dynamic = "force-dynamic";

type PublicHandlePageProps = {
  params: Promise<{ handle: string }>;
};

export async function generateMetadata({
  params,
}: PublicHandlePageProps): Promise<Metadata> {
  const { handle } = await params;
  const profile = await getPublicHandleProfile(handle);

  if (!profile) {
    return {
      title: "Handle profile",
    };
  }

  return {
    title: `\u20A6${profile.handle}`,
    description: `${profile.displayName} on NairaTag. Verified public handle profile with privacy-safe trust signals.`,
    openGraph: {
      title: `\u20A6${profile.handle} on NairaTag`,
      description: `${profile.displayName} public handle profile.`,
      type: "profile",
      images: [{ url: `/h/${profile.handle}/opengraph-image`, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: `\u20A6${profile.handle} on NairaTag`,
      description: `${profile.displayName} public handle profile.`,
      images: [`/h/${profile.handle}/opengraph-image`],
    },
  };
}

export default async function PublicHandlePage({ params }: PublicHandlePageProps) {
  const { handle } = await params;
  const [profile, suggestions] = await Promise.all([
    getPublicHandleProfile(handle),
    listSuggestedHandles({ limit: 3, seed: handle, preferListed: true }),
  ]);

  return <PublicHandleProfileView profile={profile} suggestions={suggestions} />;
}
