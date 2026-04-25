import {
  getCreditProfileForHandle,
  getHandleReputation,
  getPaymentDestinationByHandle,
  listSuggestedHandles,
} from "@/lib/adminStore";
import { PaymentLinkView } from "@/components/nairatag/PaymentLinkView";

export const dynamic = "force-dynamic";

type PayPageProps = {
  params: Promise<{ handle: string }>;
  searchParams: Promise<{ amount?: string; note?: string; asset?: string; chain?: string }>;
};

function formatAmount(input?: string) {
  if (!input) return null;
  const value = Number(input);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(value);
}

function formatCryptoAmount(input?: string) {
  const value = input?.trim();
  if (!value || !/^\d+(\.\d{1,6})?$/.test(value)) return "";
  if (Number(value) <= 0) return "";
  return value;
}

export default async function PayHandlePage({
  params,
  searchParams,
}: PayPageProps) {
  const { handle } = await params;
  const query = await searchParams;
  const cleanHandle = handle.replace(/^\u20A6/u, "");
  const [payment, reputation, creditProfile, suggestions] = await Promise.all([
    getPaymentDestinationByHandle(cleanHandle),
    getHandleReputation(cleanHandle),
    getCreditProfileForHandle(cleanHandle),
    listSuggestedHandles({ limit: 6, seed: cleanHandle, preferListed: true }),
  ]);
  const isCryptoLink =
    query.asset?.toUpperCase() === "USDC" || query.chain?.toLowerCase() === "base";
  const requestedAmount = isCryptoLink ? null : formatAmount(query.amount);
  const cryptoAmount = isCryptoLink ? formatCryptoAmount(query.amount) : undefined;
  const note = query.note?.trim() || undefined;
  const queryString = new URLSearchParams();
  if (isCryptoLink) {
    queryString.set("asset", "USDC");
    queryString.set("chain", "base");
    if (cryptoAmount) queryString.set("amount", cryptoAmount);
  } else if (requestedAmount) {
    queryString.set("amount", String(requestedAmount));
  }
  if (note) queryString.set("note", note);
  const shareUrl = `/pay/${cleanHandle}${queryString.toString() ? `?${queryString.toString()}` : ""}`;

  return (
    <PaymentLinkView
      handle={cleanHandle}
      payment={payment}
      reputation={reputation}
      creditProfile={creditProfile}
      requestedAmount={requestedAmount}
      cryptoAmount={cryptoAmount}
      initialMethod={isCryptoLink ? "crypto" : "fiat"}
      note={note}
      shareUrl={shareUrl}
      suggestions={suggestions}
    />
  );
}
