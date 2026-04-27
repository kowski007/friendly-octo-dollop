import type { Metadata } from "next";

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

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

function presentDisplayName(input: string | undefined, handle: string) {
  const name = input?.trim() || "";
  if (!name || /^pending verification$/i.test(name)) {
    return `\u20A6${handle}`;
  }
  return name;
}

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

export async function generateMetadata({
  params,
  searchParams,
}: PayPageProps): Promise<Metadata> {
  const { handle } = await params;
  const query = await searchParams;
  const cleanHandle = handle.replace(/^\u20A6/u, "");
  const payment = await getPaymentDestinationByHandle(cleanHandle);
  const isCryptoLink =
    query.asset?.toUpperCase() === "USDC" || query.chain?.toLowerCase() === "base";
  const requestedAmount = isCryptoLink ? null : formatAmount(query.amount);
  const cryptoAmount = isCryptoLink ? formatCryptoAmount(query.amount) : undefined;
  const displayName = presentDisplayName(payment?.claim.displayName, cleanHandle);
  const bank = isCryptoLink ? "Base USDC" : payment?.bankAccount?.bankName || "Bank routing pending";
  const verification = payment?.claim.verification ?? "pending";
  const amountLabel = isCryptoLink
    ? cryptoAmount
      ? `${cryptoAmount} USDC`
      : "Flexible USDC amount"
    : requestedAmount
      ? formatCurrency(requestedAmount)
      : "Flexible NGN amount";
  const note = query.note?.trim() || "";
  const title = isCryptoLink
    ? `Send USDC to \u20A6${cleanHandle}`
    : `Pay \u20A6${cleanHandle} on NairaTag`;
  const description = note
    ? `${displayName}. ${note}`
    : `${displayName} on NairaTag. Open a premium pay page, confirm identity, and send money with cleaner payment context.`;

  const routeQuery = new URLSearchParams();
  const imageQuery = new URLSearchParams({
    display: displayName,
    verification,
    bank,
    amount: amountLabel,
    mode: isCryptoLink ? "crypto" : "fiat",
  });
  if (note) {
    routeQuery.set("note", note);
    imageQuery.set("note", note);
  }
  if (isCryptoLink) {
    routeQuery.set("asset", "USDC");
    routeQuery.set("chain", "base");
    if (cryptoAmount) routeQuery.set("amount", cryptoAmount);
  } else if (requestedAmount) {
    routeQuery.set("amount", String(requestedAmount));
  }

  const canonical = `/pay/${cleanHandle}${routeQuery.toString() ? `?${routeQuery.toString()}` : ""}`;
  const imageUrl =
    `/pay/${cleanHandle}/opengraph-image?${imageQuery.toString()}`;

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      title,
      description,
      type: "website",
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: `${cleanHandle} NairaTag pay page`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
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
