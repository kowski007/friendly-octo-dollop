import type { Metadata } from "next";

import { PaymentLinkBuilder } from "@/components/nairatag/PaymentLinkBuilder";

export const metadata: Metadata = {
  title: "Create PayLink",
  description:
    "Create a simple NairaTag PayLink you can share anywhere to receive payments by name.",
};

export default function PayCreatePage() {
  return <PaymentLinkBuilder mode="create" />;
}
