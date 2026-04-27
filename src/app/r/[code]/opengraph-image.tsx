import { ImageResponse } from "next/og";

import { OG_IMAGE_SIZE, renderOgCard } from "@/lib/og";

export const runtime = "edge";
export const size = OG_IMAGE_SIZE;
export const contentType = "image/png";

type ImageProps = {
  params: Promise<{ code: string }>;
  searchParams?: Promise<{
    handle?: string;
    display?: string;
    signup?: string;
    conversion?: string;
    trust?: string;
  }>;
};

function cleanParam(value?: string) {
  return value?.trim() || "";
}

export default async function Image({ params, searchParams }: ImageProps) {
  const { code } = await params;
  const query = (await searchParams) || {};
  const cleanCode = code.replace(/^\u20A6/u, "");
  const handle = cleanParam(query.handle) || `\u20A6${cleanCode}`;
  const displayName = cleanParam(query.display) || "NairaTag referral";
  const signupPoints = cleanParam(query.signup) || "+25";
  const conversionPoints = cleanParam(query.conversion) || "+100";
  const trust = cleanParam(query.trust) || "Trust score live";

  return new ImageResponse(
    renderOgCard({
      brandLabel: "Referral invite",
      topBadge: {
        label: "Invite rewards",
        tone: "green",
      },
      eyebrow: "Growth layer",
      title: handle,
      subtitle: `Join ${displayName} on NairaTag`,
      description:
        "Claim your own \u20A6handle through this invite, complete verification, and start receiving money with a premium payment identity.",
      accentLabel: "Referral share card",
      infoRows: [
        { label: "Signup", value: signupPoints },
        { label: "Claim", value: conversionPoints },
        { label: "Referrer trust", value: trust },
      ],
      featureCards: [
        {
          label: "Own your name",
          value: "Reserve a shareable \u20A6handle that becomes your payment identity.",
          tone: "dark",
        },
        {
          label: "Verified onboarding",
          value: "Phone, BVN, and payout checks can strengthen trust over time.",
          tone: "green",
        },
        {
          label: "Portable rewards",
          value: "Referral points are tracked automatically after signup and claim.",
          tone: "soft",
        },
      ],
    }),
    size
  );
}
