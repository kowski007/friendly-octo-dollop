import { notFound } from "next/navigation";

import { PaylinkReceiptView } from "@/components/nairatag/PaylinkReceiptView";
import { getPaylinkReceiptByPaymentId } from "@/lib/paylinks";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ paymentId: string }>;
};

export default async function PaymentReceiptPage({ params }: PageProps) {
  const { paymentId } = await params;
  const receipt = await getPaylinkReceiptByPaymentId(paymentId).catch(() => null);
  if (!receipt) notFound();

  return <PaylinkReceiptView receipt={receipt} />;
}
