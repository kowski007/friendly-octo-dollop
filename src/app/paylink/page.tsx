import type { Metadata } from "next";

import { PaymentLinksProductPage } from "@/components/nairatag/PaymentLinksProductPage";

export const metadata: Metadata = {
  title: "Payment Links",
  description:
    "Create NairaTag PayLinks that accept bank transfers and Base USDC from one hosted link.",
};

export default function PaylinkPage() {
  return <PaymentLinksProductPage />;
}
