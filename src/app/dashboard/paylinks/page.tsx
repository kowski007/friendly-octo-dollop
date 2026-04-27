import type { Metadata } from "next";

import { PaymentLinkBuilder } from "@/components/nairatag/PaymentLinkBuilder";

export const metadata: Metadata = {
  title: "PayLinks Dashboard",
  description:
    "Create, manage, and monitor saved NairaTag PayLinks with checkout and settlement tracking.",
};

export default function DashboardPaylinksPage() {
  return <PaymentLinkBuilder mode="dashboard" />;
}
