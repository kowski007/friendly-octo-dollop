import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SavedPaylinkCheckoutView } from "@/components/nairatag/SavedPaylinkCheckoutView";
import type { PaylinkPublicView } from "@/lib/paylinks";
import { getPublicPaylinkByShortCode } from "@/lib/paylinks";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ handle: string; slug: string }>;
};

function formatPaylinkAmountLabel(record: PaylinkPublicView) {
  if (record.amountType === "fixed" && record.amount) {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    }).format(record.amount);
  }

  if (record.amountType === "range" && record.amountMin && record.amountMax) {
    const formatter = new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    });
    return `${formatter.format(record.amountMin)} - ${formatter.format(record.amountMax)}`;
  }

  if (record.amountType === "suggested" && (record.suggestedAmounts?.length ?? 0) > 0) {
    return "Suggested NGN amounts";
  }

  return "Flexible NGN amount";
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { handle, slug } = await params;
  const cleanHandle = handle.replace(/^\u20A6/u, "");
  const shortCode = `${cleanHandle}/${slug}`;
  const record = await getPublicPaylinkByShortCode(shortCode).catch(() => null);

  if (!record) {
    return {
      title: "PayLink",
      description: "Open this NairaTag PayLink to complete payment securely.",
    };
  }

  const paylink = record.publicView;
  const title = paylink.title || `Pay \u20A6${paylink.handle}`;
  const description =
    paylink.description ||
    `Pay ${paylink.recipient.displayName} through a premium NairaTag checkout experience.`;
  const amountLabel = formatPaylinkAmountLabel(paylink);
  const imageUrl =
    `/pay/${paylink.handle}/${slug}/opengraph-image?` +
    new URLSearchParams({
      title,
      description,
      recipient: paylink.recipient.displayName,
      bank: paylink.recipient.bank,
      amount: amountLabel,
      status: paylink.status,
    }).toString();

  return {
    title,
    description,
    alternates: {
      canonical: `/pay/${paylink.handle}/${slug}`,
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
          alt: `${paylink.handle} saved PayLink`,
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

export default async function PaylinkSlugPage({ params }: PageProps) {
  const { handle, slug } = await params;
  const shortCode = `${handle.replace(/^\u20A6/u, "")}/${slug}`;
  const record = await getPublicPaylinkByShortCode(shortCode).catch(() => null);

  if (!record) {
    notFound();
  }

  return <SavedPaylinkCheckoutView paylink={record.publicView} />;
}
