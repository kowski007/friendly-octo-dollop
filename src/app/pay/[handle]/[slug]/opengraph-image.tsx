import { ImageResponse } from "next/og";

import { OG_IMAGE_SIZE, renderOgCard } from "@/lib/og";

export const runtime = "edge";
export const size = OG_IMAGE_SIZE;
export const contentType = "image/png";

type ImageProps = {
  params: Promise<{ handle: string; slug: string }>;
  searchParams?: Promise<{
    title?: string;
    description?: string;
    recipient?: string;
    bank?: string;
    amount?: string;
    status?: string;
  }>;
};

function cleanParam(value?: string) {
  return value?.trim() || "";
}

function statusLabel(status: string) {
  if (status === "paused") return "Paused";
  if (status === "expired") return "Expired";
  return "Live PayLink";
}

export default async function Image({ params, searchParams }: ImageProps) {
  const { handle } = await params;
  const query = (await searchParams) || {};
  const cleanHandle = handle.replace(/^\u20A6/u, "");
  const title = cleanParam(query.title) || `Pay \u20A6${cleanHandle}`;
  const description =
    cleanParam(query.description) ||
    "Open this NairaTag PayLink to complete payment through a premium hosted checkout.";
  const recipient = cleanParam(query.recipient) || `\u20A6${cleanHandle}`;
  const bank = cleanParam(query.bank) || "Bank routing ready";
  const amount = cleanParam(query.amount) || "Flexible NGN amount";
  const status = cleanParam(query.status) || "active";

  return new ImageResponse(
    renderOgCard({
      brandLabel: "Saved PayLink checkout",
      topBadge: {
        label: statusLabel(status),
        tone: status === "active" ? "green" : "white",
      },
      eyebrow: "Checkout link",
      title,
      subtitle: `Pay ${recipient}`,
      description,
      accentLabel: "Checkout preview",
      infoRows: [
        { label: "Amount", value: amount },
        { label: "Bank", value: bank },
        { label: "Handle", value: `\u20A6${cleanHandle}` },
      ],
      featureCards: [
        {
          label: "Hosted checkout",
          value: "Open a cleaner payment flow with receipt and settlement tracking.",
          tone: "dark",
        },
        {
          label: "Recipient trust",
          value: "Show the named recipient and bank context before payment starts.",
          tone: "green",
        },
        {
          label: "Share-ready",
          value: "Designed to preview beautifully on X, WhatsApp, Telegram, and more.",
          tone: "soft",
        },
      ],
    }),
    size
  );
}
