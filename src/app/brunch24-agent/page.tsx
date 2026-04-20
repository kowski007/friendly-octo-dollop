import type { Metadata } from "next";

import { Brunch24AgentPlayground } from "@/components/nairatag/Brunch24AgentPlayground";

export const metadata: Metadata = {
  title: "Brunch24 Agent Tester",
  description: "Local Brunch24 V1 concierge tester for food, hotels, events, and vendor onboarding.",
};

export default function Brunch24AgentPage() {
  return <Brunch24AgentPlayground />;
}
