import type { Metadata } from "next";

import { PaymentLinkBuilder } from "@/components/nairatag/PaymentLinkBuilder";

export const metadata: Metadata = {
  title: "Create Payment Link",
  description:
    "Build a hosted NairaTag PayLink you can share anywhere to receive payments via your handle.",
};

export default function PaymentLinkBuilderPage() {
  return <PaymentLinkBuilder />;
}

