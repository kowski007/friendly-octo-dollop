import type { Metadata } from "next";

import { getPublicHandleProfile } from "@/lib/adminStore";
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
    },
    twitter: {
      card: "summary",
      title: `\u20A6${profile.handle} on NairaTag`,
      description: `${profile.displayName} public handle profile.`,
    },
  };
}

export default async function PublicHandlePage({ params }: PublicHandlePageProps) {
  const { handle } = await params;
  const profile = await getPublicHandleProfile(handle);

  return <PublicHandleProfileView profile={profile} />;
}
