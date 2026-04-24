import type { Metadata } from "next";

import { CryptoSendView } from "@/components/nairatag/CryptoSendView";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Send Crypto",
  description: "Send Base USDC to a NairaTag handle.",
};

export default function SendCryptoPage() {
  return <CryptoSendView />;
}
