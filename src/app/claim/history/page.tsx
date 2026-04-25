import type { Metadata } from "next";

import { AgentHistoryView } from "@/components/nairatag/AgentHistoryView";

export const metadata: Metadata = {
  title: "Claim history",
  description: "Prompt shortcuts and utilities for the NairaTag claim flow.",
};

export default function ClaimHistoryPage() {
  return <AgentHistoryView />;
}
