import { ImageResponse } from "next/og";

import { OG_IMAGE_SIZE, renderOgCard } from "@/lib/og";

export const runtime = "edge";
export const size = OG_IMAGE_SIZE;
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    renderOgCard({
      brandLabel: "Payment identity for Nigeria",
      topBadge: {
        label: "Live platform",
        tone: "green",
      },
      eyebrow: "Handle-first money movement",
      title: "Send money to a name",
      subtitle: "Not an account number.",
      description:
        "Claim a premium NairaTag handle, verify identity, share payment links, and move money through a cleaner trust layer.",
      accentLabel: "NairaTag network",
      infoRows: [
        { label: "Identity", value: "\u20A6handle" },
        { label: "Verification", value: "Phone \u2022 BVN \u2022 Bank" },
        { label: "Rails", value: "Fiat \u2022 Base USDC" },
      ],
      featureCards: [
        {
          label: "Claim",
          value: "Own a clean \u20A6name people can remember.",
          tone: "dark",
        },
        {
          label: "Pay",
          value: "Hosted checkout, receipts, and tracked settlement.",
          tone: "green",
        },
        {
          label: "Share",
          value: "Profiles, referrals, and social-ready payment cards.",
          tone: "soft",
        },
      ],
    }),
    size
  );
}
