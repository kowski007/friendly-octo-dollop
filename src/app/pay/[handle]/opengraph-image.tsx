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
    amount?: string;
    note?: string;
    mode?: string;
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
  const displayName = cleanParam(query.display) || `Pay ${displayHandle}`;
  const mode = cleanParam(query.mode) === "crypto" ? "crypto" : "fiat";
  const verification = verificationLabel(cleanParam(query.verification));
  const bank = cleanParam(query.bank) || (mode === "crypto" ? "Base USDC" : "Bank routing pending");
  const amount = cleanParam(query.amount) || (mode === "crypto" ? "Flexible USDC amount" : "Flexible NGN amount");
  const note = cleanParam(query.note);
  const topBadgeLabel = mode === "crypto" ? "Base USDC" : verification;

  return new ImageResponse(
    renderOgCard({
      brandLabel: mode === "crypto" ? "Crypto pay page" : "Direct pay page",
      topBadge: {
        label: topBadgeLabel,
        tone: mode === "crypto" ? "dark" : cleanParam(query.verification) === "pending" ? "white" : "green",
      },
      eyebrow: mode === "crypto" ? "Wallet destination" : "Hosted payment surface",
      title: `Pay ${displayHandle}`,
      subtitle: displayName,
      description:
        note ||
        "Open a premium NairaTag pay page, review the recipient, and complete the payment with cleaner identity and destination context.",
      accentLabel: mode === "crypto" ? "Base payout route" : "Recipient preview",
      infoRows: [
        { label: "Amount", value: amount },
        { label: "Destination", value: bank },
        { label: "Identity", value: topBadgeLabel },
      ],
      featureCards: [
        {
          label: "Pay confidently",
          value: "See who owns the handle before money moves.",
          tone: "dark",
        },
        {
          label: mode === "crypto" ? "Crypto-ready" : "Bank-ready",
          value:
            mode === "crypto"
              ? "Resolve the handle to a Base USDC destination."
              : "Move through a clean hosted payment page with routing context.",
          tone: "green",
        },
        {
          label: "Share anywhere",
          value: "Built to preview cleanly across X, WhatsApp, Telegram, and more.",
          tone: "soft",
        },
      ],
    }),
    size
  );
}
