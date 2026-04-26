import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { PaylinkReceiptView } from "@/components/nairatag/PaylinkReceiptView";
import { getPaylinkReceiptByPaymentId } from "@/lib/paylinks";
import { verifyReceiptAccessToken } from "@/lib/paylinks/receiptAccess";
import { verifySessionToken } from "@/lib/session";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ paymentId: string }>;
  searchParams?: Promise<{ access?: string }>;
};

export default async function PaymentReceiptPage({
  params,
  searchParams,
}: PageProps) {
  const { paymentId } = await params;
  const token = (await cookies()).get("nt_session")?.value || "";
  const payload = token ? verifySessionToken(token) : null;
  const accessToken = ((await searchParams)?.access || "").trim();
  const hasReceiptAccessToken =
    accessToken && verifyReceiptAccessToken(accessToken, paymentId);

  if (!payload && !hasReceiptAccessToken) {
    notFound();
  }

  const receipt = await getPaylinkReceiptByPaymentId(
    paymentId,
    hasReceiptAccessToken ? undefined : payload?.uid
  ).catch(() => null);
  if (!receipt) notFound();

  const ownerView = Boolean(payload && receipt.payment.ownerId === payload.uid);

  return <PaylinkReceiptView receipt={receipt} ownerView={ownerView} />;
}
