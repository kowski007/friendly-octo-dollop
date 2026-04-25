import type { Metadata } from "next";

import { ClaimPageView } from "@/components/nairatag/ClaimPageView";

export const metadata: Metadata = {
  title: "Claim your \u20A6handle",
  description: "Resolve a NairaTag handle, verify your phone, and claim it on one page.",
};

export default function ClaimPage() {
  return <ClaimPageView />;
}
