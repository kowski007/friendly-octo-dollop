import type { Metadata } from "next";

import { AgentPlayground } from "@/components/nairatag/AgentPlayground";

export const metadata: Metadata = {
  title: "Agent Tester",
  description: "Test the local NairaTag claim agent inside the app.",
};

export default function AgentPage() {
  return <AgentPlayground />;
}
