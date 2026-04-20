import type { Metadata } from "next";

import { AgentHistoryView } from "@/components/nairatag/AgentHistoryView";

export const metadata: Metadata = {
  title: "Agent History",
  description: "Prompt shortcuts and utilities for the NairaTag agent tester.",
};

export default function AgentHistoryPage() {
  return <AgentHistoryView />;
}
