import type { MarketplaceListingRecord, Verification } from "./adminTypes";

type ClaimBroadcastEvent = {
  type: "handle_claimed";
  handle: string;
  verification: Verification;
  profileUrl: string;
  totalClaims: number;
};

type ListingBroadcastEvent = {
  type: "marketplace_listing_created" | "marketplace_listing_updated";
  handle: string;
  saleMode: MarketplaceListingRecord["saleMode"];
  askAmount?: number | null;
  minOfferAmount?: number | null;
  status: MarketplaceListingRecord["status"];
  listingUrl: string;
};

type OfferBroadcastEvent = {
  type: "marketplace_offer_submitted" | "marketplace_offer_updated";
  handle: string;
  amount: number;
  buyerName: string;
  listingUrl: string;
};

type SaleBroadcastEvent = {
  type: "handle_sold";
  handle: string;
  amount: number;
  buyerName: string;
  profileUrl: string;
};

export type TelegramChannelEvent =
  | ClaimBroadcastEvent
  | ListingBroadcastEvent
  | OfferBroadcastEvent
  | SaleBroadcastEvent;

const NAIRA = "\u20A6";
const CHANNEL_ICONS = {
  claim: "\u{1F389}",
  listing: "\u{1F3F7}\u{FE0F}",
  listingUpdate: "\u{1F504}",
  offer: "\u{1F4B8}",
  offerUpdate: "\u{1F501}",
  sold: "\u{2705}",
  channel: "\u{1F4E3}",
} as const;

function telegramBotToken() {
  return (process.env.NT_TELEGRAM_BOT_TOKEN || "").trim();
}

function telegramChannelId() {
  return (process.env.NT_TELEGRAM_CHANNEL_ID || "").trim();
}

function formatHandle(handle: string) {
  return `${NAIRA}${handle}`;
}

function formatVerification(verification: Verification) {
  if (verification === "business") return "Business verified";
  if (verification === "verified") return "Verified identity";
  return "Claimed identity";
}

function formatNaira(amount?: number | null) {
  if (!amount || !Number.isFinite(amount)) return null;
  return `${NAIRA}${Math.round(amount).toLocaleString("en-NG")}`;
}

function saleModeSummary(event: ListingBroadcastEvent) {
  if (event.saleMode === "fixed_price") {
    return formatNaira(event.askAmount) || "Fixed price";
  }

  const minimum = formatNaira(event.minOfferAmount);
  return minimum ? `Offers from ${minimum}` : "Offers open";
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function eventText(event: TelegramChannelEvent) {
  if (event.type === "handle_claimed") {
    return [
      `${CHANNEL_ICONS.claim} <b>New NairaTag claim</b>`,
      `<b>${escapeHtml(formatHandle(event.handle))}</b> is now live`,
      `${escapeHtml(formatVerification(event.verification))}`,
      `Total claims: <b>${event.totalClaims.toLocaleString("en-NG")}</b>`,
      `<a href="${escapeHtml(event.profileUrl)}">Open public profile</a>`,
    ].join("\n");
  }

  if (
    event.type === "marketplace_listing_created" ||
    event.type === "marketplace_listing_updated"
  ) {
    return [
      event.type === "marketplace_listing_created"
        ? `${CHANNEL_ICONS.listing} <b>New marketplace listing</b>`
        : `${CHANNEL_ICONS.listingUpdate} <b>Marketplace listing updated</b>`,
      `<b>${escapeHtml(formatHandle(event.handle))}</b>`,
      escapeHtml(saleModeSummary(event)),
      `Status: <b>${escapeHtml(event.status.replaceAll("_", " "))}</b>`,
      `<a href="${escapeHtml(event.listingUrl)}">Open listing</a>`,
    ].join("\n");
  }

  if (
    event.type === "marketplace_offer_submitted" ||
    event.type === "marketplace_offer_updated"
  ) {
    return [
      event.type === "marketplace_offer_submitted"
        ? `${CHANNEL_ICONS.offer} <b>New marketplace offer</b>`
        : `${CHANNEL_ICONS.offerUpdate} <b>Marketplace offer updated</b>`,
      `<b>${escapeHtml(formatHandle(event.handle))}</b>`,
      `${escapeHtml(event.buyerName)} offered <b>${escapeHtml(
        formatNaira(event.amount) || `${NAIRA}0`
      )}</b>`,
      `<a href="${escapeHtml(event.listingUrl)}">Review listing</a>`,
    ].join("\n");
  }

  if (event.type === "handle_sold") {
    return [
      `${CHANNEL_ICONS.sold} <b>Handle sold</b>`,
      `<b>${escapeHtml(formatHandle(event.handle))}</b>`,
      `Closed at <b>${escapeHtml(formatNaira(event.amount) || `${NAIRA}0`)}</b>`,
      `Buyer: ${escapeHtml(event.buyerName)}`,
      `<a href="${escapeHtml(event.profileUrl)}">Open public profile</a>`,
    ].join("\n");
  }

  return `${CHANNEL_ICONS.channel} <b>NairaTag update</b>`;
}

async function sendTelegramChannelMessage(text: string) {
  const token = telegramBotToken();
  const chatId = telegramChannelId();
  if (!token || !chatId) {
    return { ok: false as const, skipped: true as const, reason: "not_configured" };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.warn("telegram_channel_send_failed", response.status, body);
      return { ok: false as const, skipped: false as const, reason: "http_error" };
    }

    return { ok: true as const, skipped: false as const };
  } catch (error) {
    console.warn(
      "telegram_channel_send_failed",
      error instanceof Error ? error.message : "unknown_error"
    );
    return { ok: false as const, skipped: false as const, reason: "request_failed" };
  } finally {
    clearTimeout(timeout);
  }
}

export async function broadcastTelegramChannelEvent(event: TelegramChannelEvent) {
  return sendTelegramChannelMessage(eventText(event));
}

let channelQueue: Promise<unknown> = Promise.resolve();

export function queueTelegramChannelEvent(event: TelegramChannelEvent) {
  const run = channelQueue.then(
    () => broadcastTelegramChannelEvent(event),
    () => broadcastTelegramChannelEvent(event)
  );
  channelQueue = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}
