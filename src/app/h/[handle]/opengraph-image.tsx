import { ImageResponse } from "next/og";

import { OG_IMAGE_SIZE, renderOgCard, verificationLabel } from "@/lib/og";

export const runtime = "edge";
export const size = OG_IMAGE_SIZE;
export const contentType = "image/png";

type ImageProps = {
  params: Promise<{ handle: string }>;
  searchParams?: Promise<{
    display?: string;
    verification?: string;
    bank?: string;
    trust?: string;
  }>;
};

function cleanParam(value?: string) {
  return value?.trim() || "";
}

export default async function Image({ params, searchParams }: ImageProps) {
  const { handle } = await params;
  const query = (await searchParams) || {};
  const cleanHandle = handle.replace(/^\u20A6/u, "");
  const displayHandle = `\u20A6${cleanHandle}`;
  const displayName = cleanParam(query.display) || "NairaTag payment identity";
  const verification = verificationLabel(cleanParam(query.verification));
  const bank = cleanParam(query.bank) || "Bank routing pending";
  const trust = cleanParam(query.trust) || "Trust score live";

  return new ImageResponse(
    renderOgCard({
      brandLabel: "Public handle profile",
      topBadge: {
        label: verification,
        tone: cleanParam(query.verification) === "pending" ? "white" : "green",
      },
      eyebrow: "Shareable identity",
      title: displayHandle,
      subtitle: displayName,
      description:
        "A premium NairaTag profile card with privacy-safe trust signals, payout context, and a clean payment identity you can share anywhere.",
      accentLabel: "Handle trust layer",
      infoRows: [
        { label: "Verification", value: verification },
        { label: "Bank", value: bank },
        { label: "Trust", value: trust },
      ],
      featureCards: [
        {
          label: "Pay by name",
          value: "Replace raw account numbers with a memorable \u20A6handle.",
          tone: "dark",
        },
        {
          label: "Trust preview",
          value: "Show verification and payout context before money moves.",
          tone: "green",
        },
        {
          label: "Share anywhere",
          value: "Works as a polished card on WhatsApp, X, Telegram, and more.",
          tone: "soft",
        },
      ],
    }),
    size
  );
}
