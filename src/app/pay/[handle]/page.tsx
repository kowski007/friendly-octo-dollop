import { getPaymentDestinationByHandle } from "@/lib/adminStore";
import { PaymentLinkView, formatAmount } from "@/components/nairatag/PaymentLinkView";

export const dynamic = "force-dynamic";

type PayPageProps = {
  params: Promise<{ handle: string }>;
  searchParams: Promise<{ amount?: string; note?: string }>;
};

export default async function PayHandlePage({
  params,
  searchParams,
}: PayPageProps) {
  const { handle } = await params;
  const query = await searchParams;
  const payment = await getPaymentDestinationByHandle(handle);
  const requestedAmount = formatAmount(query.amount);
  const note = query.note?.trim() || undefined;
  const cleanHandle = handle.replace(/^\u20A6/u, "");
  const queryString = new URLSearchParams();
  if (requestedAmount) queryString.set("amount", String(requestedAmount));
  if (note) queryString.set("note", note);
  const shareUrl = `/pay/${cleanHandle}${queryString.toString() ? `?${queryString.toString()}` : ""}`;

  return (
    <PaymentLinkView
      handle={cleanHandle}
      payment={payment}
      requestedAmount={requestedAmount}
      note={note}
      shareUrl={shareUrl}
    />
  );
}
