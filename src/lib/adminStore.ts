import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

import {
  isDatabaseBackedAdminStoreEnabled,
  readAdminStateFromDatabase,
  writeAdminStateToDatabase,
} from "./adminPersistence";
import type {
  AdminMetrics,
  ApiLogRecord,
  BankAccountRecord,
  ClaimRecord,
  CreditProfile,
  HandleReputation,
  MarketplaceEligibility,
  MarketplaceListingDetail,
  MarketplaceListingRecord,
  MarketplaceListingStatus,
  MarketplaceTransferStatus,
  MarketplaceTransferDetail,
  MarketplaceTransferRecord,
  MarketplaceListingView,
  MarketplaceOfferRecord,
  MarketplaceStats,
  NotificationPriority,
  NotificationRecord,
  NotificationType,
  OtpRecord,
  PublicHandleProfile,
  ReferralRecord,
  ReferralSource,
  TransactionRecord,
  UserRecord,
  Verification,
} from "./adminTypes";

export type AdminData = {
  claims: ClaimRecord[];
  apiLogs: ApiLogRecord[];
  notifications: NotificationRecord[];
  users: UserRecord[];
  otps: OtpRecord[];
  bankAccounts: BankAccountRecord[];
  transactions: TransactionRecord[];
  marketplaceListings: MarketplaceListingRecord[];
  marketplaceOffers: MarketplaceOfferRecord[];
  marketplaceTransfers: MarketplaceTransferRecord[];
  referrals: ReferralRecord[];
};

const DATA_FILE = path.join(process.cwd(), "data", "nairatag-admin.json");
const MAX_API_LOGS = 5000;
const MAX_NOTIFICATIONS = 5000;
const REFERRAL_SIGNUP_POINTS = 25;
const REFERRAL_CONVERSION_POINTS = 100;
const DEFAULT_ADMIN_DB_TIMEOUT_MS = 1500;
const DEFAULT_ADMIN_DB_FALLBACK_COOLDOWN_MS = 60000;
let storageWarningShown = false;
let databaseFallbackUntil = 0;

function emptyData(): AdminData {
  return {
    claims: [],
    apiLogs: [],
    notifications: [],
    users: [],
    otps: [],
    bankAccounts: [],
    transactions: [],
    marketplaceListings: [],
    marketplaceOffers: [],
    marketplaceTransfers: [],
    referrals: [],
  };
}

function normalizeReferralRecord(referral: ReferralRecord): ReferralRecord {
  return {
    ...referral,
    signupPoints:
      typeof referral.signupPoints === "number" && referral.signupPoints > 0
        ? referral.signupPoints
        : REFERRAL_SIGNUP_POINTS,
    conversionPoints:
      typeof referral.conversionPoints === "number" && referral.conversionPoints > 0
        ? referral.conversionPoints
        : referral.convertedAt
          ? REFERRAL_CONVERSION_POINTS
          : 0,
  };
}

let queue: Promise<unknown> = Promise.resolve();
function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

async function ensureDataFile() {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, JSON.stringify(emptyData(), null, 2), "utf8");
  }
}

function normalizeData(parsed: Partial<AdminData> | null | undefined): AdminData {
  return {
    claims: Array.isArray(parsed?.claims)
      ? (parsed!.claims as ClaimRecord[])
      : [],
    apiLogs: Array.isArray(parsed?.apiLogs)
      ? (parsed!.apiLogs as ApiLogRecord[])
      : [],
    notifications: Array.isArray(parsed?.notifications)
      ? (parsed!.notifications as NotificationRecord[])
      : [],
    users: Array.isArray(parsed?.users) ? (parsed!.users as UserRecord[]) : [],
    otps: Array.isArray(parsed?.otps) ? (parsed!.otps as OtpRecord[]) : [],
    bankAccounts: Array.isArray(parsed?.bankAccounts)
      ? (parsed!.bankAccounts as BankAccountRecord[])
      : [],
    transactions: Array.isArray(parsed?.transactions)
      ? (parsed!.transactions as TransactionRecord[])
      : [],
    marketplaceListings: Array.isArray(parsed?.marketplaceListings)
      ? (parsed!.marketplaceListings as MarketplaceListingRecord[])
      : [],
    marketplaceOffers: Array.isArray(parsed?.marketplaceOffers)
      ? (parsed!.marketplaceOffers as MarketplaceOfferRecord[])
      : [],
    marketplaceTransfers: Array.isArray(parsed?.marketplaceTransfers)
      ? (parsed!.marketplaceTransfers as MarketplaceTransferRecord[])
      : [],
    referrals: Array.isArray(parsed?.referrals)
      ? (parsed!.referrals as ReferralRecord[]).map(normalizeReferralRecord)
      : [],
  };
}

async function readFileDataUnsafe(): Promise<AdminData> {
  await ensureDataFile();
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<AdminData> | null;
    return normalizeData(parsed);
  } catch {
    const corruptPath = `${DATA_FILE}.corrupt-${Date.now()}`;
    try {
      await fs.rename(DATA_FILE, corruptPath);
    } catch {
      // Ignore rename failures; we'll still rewrite a healthy copy below.
    }

    const initial = emptyData();
    await fs.writeFile(DATA_FILE, JSON.stringify(initial, null, 2), "utf8");
    return initial;
  }
}

async function writeFileDataUnsafe(data: AdminData) {
  await ensureDataFile();
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
}

function warnStorageFallback(error: unknown) {
  databaseFallbackUntil = Date.now() + adminDatabaseFallbackCooldownMs();
  if (storageWarningShown) return;
  storageWarningShown = true;
  console.warn(
    "[nairatag] Falling back to file-backed admin store:",
    error instanceof Error ? error.message : String(error)
  );
}

function databaseFallbackActive() {
  return Date.now() < databaseFallbackUntil;
}

function adminDatabaseTimeoutMs() {
  const configured = Number(process.env.NT_ADMIN_DB_TIMEOUT_MS ?? "");
  return Number.isFinite(configured) && configured > 0
    ? configured
    : DEFAULT_ADMIN_DB_TIMEOUT_MS;
}

function adminDatabaseFallbackCooldownMs() {
  const configured = Number(process.env.NT_ADMIN_DB_FALLBACK_COOLDOWN_MS ?? "");
  return Number.isFinite(configured) && configured > 0
    ? configured
    : DEFAULT_ADMIN_DB_FALLBACK_COOLDOWN_MS;
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label}_timeout`)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

async function readDataUnsafe(): Promise<AdminData> {
  if (isDatabaseBackedAdminStoreEnabled() && !databaseFallbackActive()) {
    try {
      const timeoutMs = adminDatabaseTimeoutMs();
      const dbData = await withTimeout(
        readAdminStateFromDatabase(),
        timeoutMs,
        "read_admin_db"
      );
      if (dbData) return normalizeData(dbData);

      const fileData = await readFileDataUnsafe();
      await withTimeout(
        writeAdminStateToDatabase(fileData),
        timeoutMs,
        "sync_admin_db"
      );
      return fileData;
    } catch (error) {
      warnStorageFallback(error);
    }
  }

  return readFileDataUnsafe();
}

function notificationWebhookUrl() {
  return (
    process.env.NT_NOTIFICATION_WEBHOOK_URL ||
    process.env.NT_EXTERNAL_NOTIFICATION_WEBHOOK_URL ||
    ""
  ).trim();
}

function notificationWebhookSecret() {
  return (
    process.env.NT_NOTIFICATION_WEBHOOK_SECRET ||
    process.env.NT_EXTERNAL_NOTIFICATION_WEBHOOK_SECRET ||
    ""
  ).trim();
}

function notificationDeliveryDisabled() {
  return process.env.NT_NOTIFICATION_DELIVERY_DISABLED === "1";
}

function notificationDeliveryTimeoutMs() {
  const configured = Number(process.env.NT_NOTIFICATION_DELIVERY_TIMEOUT_MS ?? "");
  return Number.isFinite(configured) && configured > 0 ? configured : 2500;
}

function signWebhookBody(body: string, secret: string) {
  return `sha256=${crypto.createHmac("sha256", secret).update(body).digest("hex")}`;
}

async function postNotificationWebhook(notification: NotificationRecord) {
  const url = notificationWebhookUrl();
  if (!url) return { status: "skipped" as const };

  const body = JSON.stringify({
    event: "notification.created",
    sentAt: new Date().toISOString(),
    notification,
  });
  const secret = notificationWebhookSecret();
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    notificationDeliveryTimeoutMs()
  );

  try {
    const headers: Record<string, string> = {
      "content-type": "application/json",
      "x-nairatag-event": "notification.created",
      "x-nairatag-notification-id": notification.id,
    };
    if (secret) headers["x-nairatag-signature"] = signWebhookBody(body, secret);

    const response = await fetch(url, {
      method: "POST",
      headers,
      body,
      signal: controller.signal,
    });

    if (!response.ok) {
      return {
        status: "failed" as const,
        error: `webhook_http_${response.status}`,
      };
    }

    return { status: "delivered" as const };
  } catch (error) {
    return {
      status: "failed" as const,
      error: error instanceof Error ? error.message : "webhook_failed",
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function deliverQueuedNotificationsUnsafe(data: AdminData) {
  if (notificationDeliveryDisabled()) return;

  const candidates = data.notifications
    .filter((notification) => {
      const attempts = notification.deliveryAttempts ?? 0;
      return (
        (notification.deliveryStatus === "queued" ||
          notification.deliveryStatus === "failed") &&
        attempts < 3
      );
    })
    .slice(0, 10);

  if (candidates.length === 0) return;

  if (!notificationWebhookUrl()) {
    for (const notification of candidates) {
      notification.deliveryStatus = "skipped";
      notification.deliveryError = undefined;
    }
    return;
  }

  for (const notification of candidates) {
    const nowIso = new Date().toISOString();
    notification.deliveryAttempts = (notification.deliveryAttempts ?? 0) + 1;
    notification.lastDeliveryAttemptAt = nowIso;

    const result = await postNotificationWebhook(notification);
    if (result.status === "delivered") {
      notification.deliveryStatus = "delivered";
      notification.deliveredAt = new Date().toISOString();
      notification.deliveryError = undefined;
    } else {
      notification.deliveryStatus = result.status;
      notification.deliveryError = "error" in result ? result.error : undefined;
    }
  }
}

async function writeDataUnsafe(data: AdminData) {
  await deliverQueuedNotificationsUnsafe(data);

  if (isDatabaseBackedAdminStoreEnabled() && !databaseFallbackActive()) {
    try {
      await withTimeout(
        writeAdminStateToDatabase(data),
        adminDatabaseTimeoutMs(),
        "write_admin_db"
      );
      return;
    } catch (error) {
      warnStorageFallback(error);
    }
  }

  await writeFileDataUnsafe(data);
}

function newId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

export function normalizeHandle(input: string) {
  return input
    .trim()
    .replace(/^\u20A6/u, "")
    .replace(/^@/u, "")
    .toLowerCase();
}

export function isValidHandle(handle: string) {
  return /^[a-z0-9_]{2,20}$/.test(handle);
}

export type ResolveResult =
  | {
      status: "claimed";
      handle: string;
      displayName: string;
      bank: string;
      verification: Verification;
    }
  | { status: "available"; handle: string }
  | { status: "invalid"; reason: string };

export async function resolveHandle(inputHandle: string): Promise<ResolveResult> {
  const normalized = normalizeHandle(inputHandle);
  if (!normalized) return { status: "invalid", reason: "missing_handle" };
  if (!isValidHandle(normalized))
    return { status: "invalid", reason: "invalid_format" };

  return enqueue(async () => {
    const data = await readDataUnsafe();
    const match = data.claims.find((c) => c.handle === normalized);
    if (!match) return { status: "available", handle: normalized };

    return {
      status: "claimed",
      handle: match.handle,
      displayName: match.displayName,
      bank: match.bank,
      verification: match.verification,
    };
  });
}

export async function claimHandle({
  handle,
  displayName,
  bank,
  verification = "pending",
  source = "web",
  userId,
  phone,
}: {
  handle: string;
  displayName?: string;
  bank?: string;
  verification?: Verification;
  source?: "web" | "api";
  userId?: string;
  phone?: string;
}) {
  const normalized = normalizeHandle(handle);
  if (!normalized) throw new Error("missing_handle");
  if (!isValidHandle(normalized)) throw new Error("invalid_handle");

  return enqueue(async () => {
    const data = await readDataUnsafe();
    const exists = data.claims.some((c) => c.handle === normalized);
    if (exists) {
      const err = new Error("already_claimed");
      // @ts-expect-error attach a code for API routes
      err.code = "already_claimed";
      throw err;
    }

    const record: ClaimRecord = {
      id: newId("claim"),
      handle: normalized,
      displayName: (displayName ?? "Pending verification").trim(),
      bank: (bank ?? "Unlinked").trim(),
      verification,
      claimedAt: new Date().toISOString(),
      source,
      userId,
      phone,
      verifiedAt:
        verification === "verified" || verification === "business"
          ? new Date().toISOString()
          : undefined,
    };

    data.claims.unshift(record);

    await writeDataUnsafe(data);
    return record;
  });
}

export async function logApiUsage(entry: Omit<ApiLogRecord, "id" | "ts">) {
  return enqueue(async () => {
    const data = await readDataUnsafe();
    const record: ApiLogRecord = {
      id: newId("log"),
      ts: new Date().toISOString(),
      ...entry,
    };

    data.apiLogs.unshift(record);
    if (data.apiLogs.length > MAX_API_LOGS) {
      data.apiLogs = data.apiLogs.slice(0, MAX_API_LOGS);
    }

    await writeDataUnsafe(data);
    return record;
  });
}

function addNotificationUnsafe(
  data: AdminData,
  entry: {
    userId?: string;
    handle?: string;
    type: NotificationType;
    title: string;
    body: string;
    priority?: NotificationPriority;
    metadata?: NotificationRecord["metadata"];
  }
) {
  const record: NotificationRecord = {
    id: newId("ntf"),
    userId: entry.userId,
    handle: entry.handle,
    type: entry.type,
    title: entry.title,
    body: entry.body,
    priority: entry.priority ?? "normal",
    status: "unread",
    createdAt: new Date().toISOString(),
    deliveryChannels: ["in_app", "webhook"],
    deliveryStatus: "queued",
    deliveryAttempts: 0,
    metadata: entry.metadata,
  };

  data.notifications.unshift(record);
  if (data.notifications.length > MAX_NOTIFICATIONS) {
    data.notifications = data.notifications.slice(0, MAX_NOTIFICATIONS);
  }
  return record;
}

function notificationAudienceMatches(
  notification: NotificationRecord,
  userId?: string,
  handle?: string
) {
  if (userId) return notification.userId === userId;
  if (handle) return notification.handle === handle;
  return false;
}

export async function createNotification(
  entry: Parameters<typeof addNotificationUnsafe>[1]
) {
  return enqueue(async () => {
    const data = await readDataUnsafe();
    const record = addNotificationUnsafe(data, entry);
    await writeDataUnsafe(data);
    return record;
  });
}

export async function listNotifications({
  limit = 25,
  offset = 0,
  userId,
  handle,
  unreadOnly = false,
}: {
  limit?: number;
  offset?: number;
  userId?: string;
  handle?: string;
  unreadOnly?: boolean;
}) {
  return enqueue(async () => {
    const data = await readDataUnsafe();
    const normalizedHandle = handle ? normalizeHandle(handle) : undefined;
    const filtered = data.notifications.filter((notification) => {
      if (userId || normalizedHandle) {
        if (!notificationAudienceMatches(notification, userId, normalizedHandle)) {
          return false;
        }
      }
      if (unreadOnly && notification.status !== "unread") return false;
      return true;
    });

    return {
      total: filtered.length,
      unread: filtered.filter((notification) => notification.status === "unread").length,
      items: filtered.slice(offset, offset + limit),
    };
  });
}

export async function markNotificationsRead({
  userId,
  notificationIds,
}: {
  userId: string;
  notificationIds?: string[];
}) {
  return enqueue(async () => {
    const data = await readDataUnsafe();
    const ids = notificationIds ? new Set(notificationIds) : null;
    const nowIso = new Date().toISOString();
    let count = 0;

    for (const notification of data.notifications) {
      if (notification.userId !== userId) continue;
      if (ids && !ids.has(notification.id)) continue;
      if (notification.status === "read") continue;
      notification.status = "read";
      notification.readAt = nowIso;
      count += 1;
    }

    await writeDataUnsafe(data);
    return { count };
  });
}

function dayKey(dateIso: string) {
  return dateIso.slice(0, 10);
}

function lastNDays(n: number) {
  const out: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function latestBankAccountForUser(
  data: AdminData,
  userId: string | undefined
): BankAccountRecord | null {
  if (!userId) return null;
  return (
    data.bankAccounts
      .filter((account) => account.userId === userId)
      .sort((a, b) => Date.parse(b.linkedAt) - Date.parse(a.linkedAt))[0] ?? null
  );
}

function findUserByPhone(data: AdminData, phone: string | undefined) {
  if (!phone) return null;
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) return null;
  return data.users.find((user) => user.phone === normalizedPhone) ?? null;
}

function buildHandleReputation(
  data: AdminData,
  claim: ClaimRecord | null
): HandleReputation | null {
  if (!claim) return null;

  const transactions = data.transactions.filter(
    (transaction) =>
      transaction.handle === claim.handle &&
      Date.parse(transaction.recordedAt) >= Date.parse(claim.claimedAt)
  );
  const settledTransactions = transactions.filter(
    (transaction) => transaction.status === "settled"
  );
  const disputedTransactions = transactions.filter(
    (transaction) => transaction.status === "disputed"
  );
  const bankAccount = latestBankAccountForUser(data, claim.userId);
  const now = Date.now();
  const accountAgeDays = Math.max(
    0,
    Math.floor((now - Date.parse(claim.claimedAt)) / (24 * 60 * 60 * 1000))
  );
  const totalVolume = settledTransactions.reduce(
    (sum, transaction) => sum + transaction.amount,
    0
  );
  const recentTransactionCount30d = transactions.filter(
    (transaction) =>
      now - Date.parse(transaction.recordedAt) <= 30 * 24 * 60 * 60 * 1000
  ).length;
  const disputeRate =
    transactions.length === 0 ? 0 : disputedTransactions.length / transactions.length;
  const verificationScore =
    claim.verification === "business"
      ? 40
      : claim.verification === "verified"
        ? 34
        : 18;
  const bankScore = bankAccount
    ? bankAccount.status === "verified"
      ? 12
      : 7
    : 0;
  const ageScore = Math.min(16, Math.round(accountAgeDays / 3));
  const activityScore = Math.min(18, transactions.length * 3);
  const volumeScore = Math.min(14, Math.round(totalVolume / 50_000) * 2);
  const disputePenalty = Math.min(
    26,
    disputedTransactions.length * 8 + Math.round(disputeRate * 24)
  );
  const trustScore = clamp(
    verificationScore + bankScore + ageScore + activityScore + volumeScore - disputePenalty,
    12,
    98
  );

  const badges: string[] = [];
  if (claim.verification === "business") {
    badges.push("Business");
  } else if (claim.verification !== "pending") {
    badges.push("Verified");
  }
  if (bankAccount) badges.push("Payout ready");
  if (transactions.length >= 3) badges.push("Active");
  if (settledTransactions.length >= 10 || totalVolume >= 250_000 || accountAgeDays >= 45) {
    badges.push("Established");
  }
  if (settledTransactions.length >= 5 && disputedTransactions.length === 0) {
    badges.push("Clean history");
  }
  if (trustScore >= 75) badges.push("High trust");

  return {
    handle: claim.handle,
    trustScore,
    transactionCount: transactions.length,
    settledTransactionCount: settledTransactions.length,
    totalVolume,
    recentTransactionCount30d,
    accountAgeDays,
    disputeRate,
    lastActivityAt: transactions[0]?.recordedAt,
    isVerified: claim.verification !== "pending",
    isBusiness: claim.verification === "business",
    isBankLinked: Boolean(bankAccount),
    badges,
  };
}

const MARKETPLACE_COMMISSION_BPS = 2000;

function marketplaceMinOwnershipDays() {
  const configured = Number(process.env.NT_MARKETPLACE_MIN_OWNERSHIP_DAYS ?? "");
  if (Number.isFinite(configured) && configured >= 0) return configured;
  return process.env.NODE_ENV === "production" ? 14 : 0;
}

function isShortHandleReserved(handle: string) {
  return handle.length <= 2;
}

function ownerSinceDays(claimedAt: string) {
  return Math.max(
    0,
    Math.floor((Date.now() - Date.parse(claimedAt)) / (24 * 60 * 60 * 1000))
  );
}

function getListingOfferStats(
  data: AdminData,
  listingId: string
): {
  offers: MarketplaceOfferRecord[];
  offerCount: number;
  pendingOfferCount: number;
  highestOfferAmount: number | null;
} {
  const offers = data.marketplaceOffers
    .filter((offer) => offer.listingId === listingId)
    .sort((a, b) => {
      if (b.amount !== a.amount) return b.amount - a.amount;
      return Date.parse(b.createdAt) - Date.parse(a.createdAt);
    });
  const pendingOffers = offers.filter((offer) => offer.status === "pending");

  return {
    offers,
    offerCount: offers.length,
    pendingOfferCount: pendingOffers.length,
    highestOfferAmount: pendingOffers[0]?.amount ?? offers[0]?.amount ?? null,
  };
}

function latestTransferForListing(
  data: AdminData,
  listingId: string
): MarketplaceTransferRecord | null {
  return (
    data.marketplaceTransfers
      .filter((transfer) => transfer.listingId === listingId)
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0] ?? null
  );
}

function buildMarketplaceListingView(
  data: AdminData,
  listing: MarketplaceListingRecord
): MarketplaceListingView | null {
  const claim = data.claims.find((entry) => entry.handle === listing.handle);
  if (!claim) return null;

  const reputation = buildHandleReputation(data, claim);
  const bankAccount = latestBankAccountForUser(data, claim.userId);
  const offerStats = getListingOfferStats(data, listing.id);

  return {
    listing,
    claim,
    reputation,
    offerCount: offerStats.offerCount,
    pendingOfferCount: offerStats.pendingOfferCount,
    highestOfferAmount: offerStats.highestOfferAmount,
    ownerSinceDays: ownerSinceDays(claim.claimedAt),
    ownerSinceAt: claim.claimedAt,
    bankLinked: Boolean(bankAccount),
  };
}

function buildMarketplaceListingDetail(
  data: AdminData,
  listing: MarketplaceListingRecord
): MarketplaceListingDetail | null {
  const summary = buildMarketplaceListingView(data, listing);
  if (!summary) return null;

  const { offers } = getListingOfferStats(data, listing.id);
  const recentTransactions = data.transactions
    .filter((transaction) => transaction.handle === listing.handle)
    .slice(0, 8);

  return {
    ...summary,
    offers,
    recentTransactions,
    transfer: latestTransferForListing(data, listing.id),
    creditProfile: buildCreditProfile(data, summary.claim),
    transferReviewRequired: true,
    reputationTransfersOnSale: false,
  };
}

function buildMarketplaceTransferDetail(
  data: AdminData,
  transfer: MarketplaceTransferRecord
): MarketplaceTransferDetail | null {
  const listing =
    data.marketplaceListings.find((entry) => entry.id === transfer.listingId) ?? null;
  const offer =
    data.marketplaceOffers.find((entry) => entry.id === transfer.offerId) ?? null;
  if (!listing || !offer) return null;

  const claim = data.claims.find((entry) => entry.handle === transfer.handle) ?? null;
  const seller = data.users.find((entry) => entry.id === transfer.sellerUserId) ?? null;
  const buyer =
    (transfer.buyerUserId
      ? data.users.find((entry) => entry.id === transfer.buyerUserId) ?? null
      : null) ?? findUserByPhone(data, transfer.buyerPhone);
  const buyerBankAccount = latestBankAccountForUser(data, buyer?.id);

  return {
    ...transfer,
    listing,
    offer,
    claim,
    seller,
    buyer,
    buyerBankAccount,
    currentReputation: buildHandleReputation(data, claim),
  };
}

function ensureMarketplaceTransferForOffer(
  data: AdminData,
  listing: MarketplaceListingRecord,
  offer: MarketplaceOfferRecord,
  nowIso: string
): MarketplaceTransferRecord {
  const existing = data.marketplaceTransfers.find(
    (transfer) =>
      transfer.listingId === listing.id &&
      transfer.offerId === offer.id &&
      transfer.status !== "rejected"
  );

  if (existing) {
    existing.buyerUserId =
      offer.buyerUserId ?? findUserByPhone(data, offer.buyerPhone)?.id;
    existing.buyerName = offer.buyerName;
    existing.buyerPhone = offer.buyerPhone;
    existing.amount = offer.amount;
    existing.updatedAt = nowIso;
    return existing;
  }

  const buyer = offer.buyerUserId
    ? data.users.find((user) => user.id === offer.buyerUserId) ?? null
    : findUserByPhone(data, offer.buyerPhone);
  const transfer: MarketplaceTransferRecord = {
    id: newId("transfer"),
    listingId: listing.id,
    offerId: offer.id,
    handle: listing.handle,
    sellerUserId: listing.sellerUserId,
    buyerUserId: buyer?.id,
    buyerName: offer.buyerName,
    buyerPhone: offer.buyerPhone,
    amount: offer.amount,
    status: "pending_review",
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  data.marketplaceTransfers.unshift(transfer);
  return transfer;
}

function buildCreditProfile(
  data: AdminData,
  claim: ClaimRecord | null
): CreditProfile | null {
  if (!claim) return null;

  const reputation = buildHandleReputation(data, claim);
  if (!reputation) return null;

  const settledVolume = reputation.totalVolume;
  const settledCount = reputation.settledTransactionCount;
  const disputedCount = Math.round(reputation.transactionCount * reputation.disputeRate);
  const activeMonths = Math.max(1, Math.ceil(reputation.accountAgeDays / 30));
  const monthlyAverageVolume = Math.round(settledVolume / activeMonths);
  const bankAccount = latestBankAccountForUser(data, claim.userId);

  const paymentHistoryScore = Math.min(
    260,
    settledCount * 12 - disputedCount * 24 + (disputedCount === 0 ? 20 : 0)
  );
  const volumeScore = Math.min(220, Math.round(monthlyAverageVolume / 20_000) * 18);
  const tenureScore = Math.min(140, Math.round(reputation.accountAgeDays / 14) * 14);
  const trustScoreComponent = Math.min(140, Math.round(reputation.trustScore * 1.35));
  const verificationScore =
    (claim.verification !== "pending" ? 36 : 0) +
    (bankAccount?.status === "verified" ? 26 : bankAccount ? 12 : 0);
  const disputePenalty = Math.min(90, disputedCount * 25);

  const rawScore =
    300 +
    paymentHistoryScore +
    volumeScore +
    tenureScore +
    trustScoreComponent +
    verificationScore -
    disputePenalty;
  const score = clamp(rawScore, 300, 850);
  const riskBand = score >= 720 ? "low" : score >= 580 ? "medium" : "high";
  const repaymentConfidence = clamp(
    Math.round(
      reputation.trustScore * 0.55 +
        Math.min(25, settledCount * 2) +
        Math.min(20, activeMonths * 2) -
        disputedCount * 8
    ),
    5,
    95
  );
  const recommendedLimitBase =
    monthlyAverageVolume * 0.35 +
    settledVolume * 0.08 +
    repaymentConfidence * 450 -
    disputedCount * 12_500;
  const recommendedLimit = Math.max(0, Math.round(recommendedLimitBase / 1000) * 1000);

  const drivers = [
    `${settledCount} settled payment${settledCount === 1 ? "" : "s"} recorded`,
    `${activeMonths} active month${activeMonths === 1 ? "" : "s"} in-system`,
    bankAccount ? `${bankAccount.bankName} payout destination linked` : "No payout destination linked yet",
    disputedCount === 0
      ? "No dispute history on the current ownership window"
      : `${disputedCount} dispute signal${disputedCount === 1 ? "" : "s"} in current ownership window`,
  ];

  return {
    handle: claim.handle,
    score,
    riskBand,
    trustScore: reputation.trustScore,
    activeMonths,
    accountAgeDays: reputation.accountAgeDays,
    settledTransactionCount: settledCount,
    disputedTransactionCount: disputedCount,
    totalVolume: settledVolume,
    monthlyAverageVolume,
    recommendedLimit,
    repaymentConfidence,
    drivers,
    lastEvaluatedAt: new Date().toISOString(),
  };
}

function publicBaseUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || process.env.NT_PUBLIC_APP_URL || "")
    .trim()
    .replace(/\/+$/, "");
}

function absoluteOrRelativeUrl(pathname: string) {
  const base = publicBaseUrl();
  return base ? `${base}${pathname}` : pathname;
}

function creditScoreRange(score?: number) {
  if (!score || score < 700) return undefined;
  const floor = Math.max(700, Math.floor(score / 50) * 50);
  return `${floor}-${Math.min(850, floor + 49)}`;
}

function publicVolumeBucket(totalVolume: number) {
  if (totalVolume < 100_000) return Math.round(totalVolume / 1_000) * 1_000;
  if (totalVolume < 1_000_000) return Math.round(totalVolume / 10_000) * 10_000;
  return Math.round(totalVolume / 100_000) * 100_000;
}

function buildPublicHandleProfile(
  data: AdminData,
  claim: ClaimRecord | null
): PublicHandleProfile | null {
  if (!claim) return null;

  const user = claim.userId
    ? data.users.find((entry) => entry.id === claim.userId) ?? null
    : null;
  const bankAccount = latestBankAccountForUser(data, claim.userId);
  const reputation = buildHandleReputation(data, claim);
  const creditProfile = buildCreditProfile(data, claim);
  const activeListing =
    data.marketplaceListings.find(
      (listing) => listing.handle === claim.handle && listing.status === "active"
    ) ?? null;
  const transactions = data.transactions.filter(
    (transaction) =>
      transaction.handle === claim.handle &&
      Date.parse(transaction.recordedAt) >= Date.parse(claim.claimedAt)
  );
  const settledTransactions = transactions.filter(
    (transaction) => transaction.status === "settled"
  );
  const totalVolume = settledTransactions.reduce(
    (sum, transaction) => sum + transaction.amount,
    0
  );
  const trustScore = reputation?.trustScore ?? (claim.verification === "pending" ? 12 : 48);
  const stars = Math.round((3.2 + (trustScore / 100) * 1.8) * 10) / 10;
  const badges = Array.from(
    new Set([
      ...(reputation?.badges ?? []),
      ...(creditProfile?.riskBand === "low" ? ["Low risk"] : []),
      ...(activeListing ? ["Marketplace seller"] : []),
    ])
  );
  const sharePath = `/h/${claim.handle}`;
  const payPath = `/pay/${claim.handle}`;

  return {
    handle: claim.handle,
    displayName: claim.displayName,
    bio: activeListing?.sellerNote,
    location: user?.geo?.city,
    memberSince: claim.claimedAt,
    lastActiveAt: reputation?.lastActivityAt,
    verification: {
      status: claim.verification,
      verified: claim.verification !== "pending",
      verifiedAt: claim.verifiedAt,
      badges,
      bankAccountVerified: bankAccount?.status === "verified",
      bvnVerified: Boolean(user?.bvnLinkedAt),
    },
    bank: {
      name: claim.bank,
      accountVerified: bankAccount?.status === "verified",
    },
    reputation: {
      trustScore,
      stars,
      reviewCount: reputation?.settledTransactionCount ?? 0,
      riskLevel: creditProfile?.riskBand ?? "unknown",
      creditScoreRange: creditScoreRange(creditProfile?.score),
      badges,
    },
    publicStats: {
      transactionCount: transactions.length,
      settledTransactionCount: settledTransactions.length,
      totalVolume: publicVolumeBucket(totalVolume),
      recentTransactionCount30d: reputation?.recentTransactionCount30d ?? 0,
      chargebackRate: reputation?.disputeRate ?? 0,
      averageTransactionSize:
        settledTransactions.length === 0
          ? 0
          : Math.round(totalVolume / settledTransactions.length),
    },
    shareUrl: absoluteOrRelativeUrl(sharePath),
    payUrl: absoluteOrRelativeUrl(payPath),
    qrPayload: absoluteOrRelativeUrl(payPath),
  };
}

function buildMarketplaceEligibility(
  data: AdminData,
  userId?: string
): MarketplaceEligibility {
  if (!userId) {
    return {
      eligible: false,
      reason: "unauthorized",
      minimumOwnershipDays: marketplaceMinOwnershipDays(),
      requiresBankLink: true,
      requiresVerifiedIdentity: false,
    };
  }

  const claim = data.claims.find((entry) => entry.userId === userId);
  if (!claim) {
    return {
      eligible: false,
      reason: "no_handle",
      minimumOwnershipDays: marketplaceMinOwnershipDays(),
      requiresBankLink: true,
      requiresVerifiedIdentity: false,
    };
  }

  const bankAccount = latestBankAccountForUser(data, userId);
  if (!bankAccount) {
    return {
      eligible: false,
      reason: "bank_link_required",
      handle: claim.handle,
      ownershipDays: ownerSinceDays(claim.claimedAt),
      minimumOwnershipDays: marketplaceMinOwnershipDays(),
      requiresBankLink: true,
      requiresVerifiedIdentity: false,
    };
  }

  if (isShortHandleReserved(claim.handle)) {
    return {
      eligible: false,
      reason: "reserved_short_handle",
      handle: claim.handle,
      ownershipDays: ownerSinceDays(claim.claimedAt),
      minimumOwnershipDays: marketplaceMinOwnershipDays(),
      requiresBankLink: true,
      requiresVerifiedIdentity: false,
    };
  }

  const ownershipDaysCount = ownerSinceDays(claim.claimedAt);
  if (ownershipDaysCount < marketplaceMinOwnershipDays()) {
    return {
      eligible: false,
      reason: "ownership_cooldown",
      handle: claim.handle,
      ownershipDays: ownershipDaysCount,
      minimumOwnershipDays: marketplaceMinOwnershipDays(),
      requiresBankLink: true,
      requiresVerifiedIdentity: false,
    };
  }

  const existingListing = data.marketplaceListings.find(
    (listing) =>
      listing.sellerUserId === userId &&
      listing.handle === claim.handle &&
      ["active", "paused", "under_review"].includes(listing.status)
  );
  if (existingListing) {
    return {
      eligible: false,
      reason: "listing_already_exists",
      handle: claim.handle,
      ownershipDays: ownershipDaysCount,
      minimumOwnershipDays: marketplaceMinOwnershipDays(),
      requiresBankLink: true,
      requiresVerifiedIdentity: false,
    };
  }

  return {
    eligible: true,
    reason: "eligible",
    handle: claim.handle,
    ownershipDays: ownershipDaysCount,
    minimumOwnershipDays: marketplaceMinOwnershipDays(),
    requiresBankLink: true,
    requiresVerifiedIdentity: false,
  };
}

export async function getAdminMetrics(): Promise<AdminMetrics> {
  return enqueue(async () => {
    const data = await readDataUnsafe();

    const today = new Date().toISOString().slice(0, 10);
    const totalClaims = data.claims.length;
    const claimsToday = data.claims.filter((c) => dayKey(c.claimedAt) === today)
      .length;
    const verifiedClaims = data.claims.filter(
      (c) => c.verification === "verified" || c.verification === "business"
    ).length;
    const pendingClaims = data.claims.filter((c) => c.verification === "pending")
      .length;

    const totalUsers = data.users.length;
    const phoneVerifiedUsers = data.users.filter((u) => Boolean(u.phoneVerifiedAt))
      .length;
    const bvnLinkedUsers = data.users.filter((u) => Boolean(u.bvnLinkedAt)).length;
    const bankLinkedUsers = data.users.filter((u) => Boolean(u.bankLinkedAt)).length;

    const totalApiCalls = data.apiLogs.length;
    const apiCallsToday = data.apiLogs.filter((l) => dayKey(l.ts) === today)
      .length;
    const since24h = Date.now() - 24 * 60 * 60 * 1000;
    const totalTransactions = data.transactions.length;
    const transactionsToday = data.transactions.filter(
      (transaction) => dayKey(transaction.recordedAt) === today
    ).length;
    const totalTransactionVolume = data.transactions
      .filter((transaction) => transaction.status === "settled")
      .reduce((sum, transaction) => sum + transaction.amount, 0);
    const activeHandles24h = new Set(
      data.transactions
        .filter((transaction) => Date.parse(transaction.recordedAt) >= since24h)
        .map((transaction) => transaction.handle)
    ).size;

    const last24h = data.apiLogs.filter((l) => Date.parse(l.ts) >= since24h);
    const ok24h = last24h.filter((l) => l.status >= 200 && l.status < 400);
    const successRate24h =
      last24h.length === 0 ? null : ok24h.length / last24h.length;
    const avgLatency24h =
      last24h.length === 0
        ? null
        : last24h.reduce((sum, l) => sum + (l.latencyMs || 0), 0) /
          last24h.length;

    const days = lastNDays(7);
    const callsLast7Days = days.map((day) => ({
      day,
      count: data.apiLogs.filter((l) => dayKey(l.ts) === day).length,
    }));

    const endpointCounts = new Map<string, number>();
    for (const l of data.apiLogs) {
      endpointCounts.set(l.endpoint, (endpointCounts.get(l.endpoint) ?? 0) + 1);
    }
    const topEndpoints = Array.from(endpointCounts.entries())
      .map(([endpoint, count]) => ({ endpoint, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    return {
      totalClaims,
      claimsToday,
      verifiedClaims,
      pendingClaims,
      totalUsers,
      phoneVerifiedUsers,
      bvnLinkedUsers,
      bankLinkedUsers,
      totalApiCalls,
      apiCallsToday,
      totalTransactions,
      transactionsToday,
      totalTransactionVolume,
      activeHandles24h,
      successRate24h,
      avgLatency24h,
      callsLast7Days,
      topEndpoints,
    };
  });
}

export async function listClaims({
  limit = 25,
  offset = 0,
  q,
}: {
  limit?: number;
  offset?: number;
  q?: string;
}) {
  return enqueue(async () => {
    const data = await readDataUnsafe();
    const query = q ? q.trim().toLowerCase() : "";
    const filtered = query
      ? data.claims.filter(
          (c) =>
            c.handle.includes(query) ||
            c.displayName.toLowerCase().includes(query) ||
            c.bank.toLowerCase().includes(query)
        )
      : data.claims;

    return {
      total: filtered.length,
      items: filtered.slice(offset, offset + limit),
    };
  });
}

export async function listPublicHandleSuggestions({ limit = 5 }: { limit?: number } = {}) {
  return enqueue(async () => {
    const data = await readDataUnsafe();
    const cappedLimit = Math.min(12, Math.max(1, limit));
    const items = data.claims
      .slice()
      .sort((a, b) => Date.parse(b.claimedAt) - Date.parse(a.claimedAt))
      .slice(0, cappedLimit)
      .map((claim) => ({
        handle: claim.handle,
        displayName: claim.displayName,
        verification: claim.verification,
      }));

    return {
      total: data.claims.length,
      items,
    };
  });
}

export async function listApiLogs({
  limit = 25,
  offset = 0,
}: {
  limit?: number;
  offset?: number;
}) {
  return enqueue(async () => {
    const data = await readDataUnsafe();
    return {
      total: data.apiLogs.length,
      items: data.apiLogs.slice(offset, offset + limit),
    };
  });
}

const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 6;

export function normalizePhone(input: string) {
  const raw = input.trim();
  if (!raw) return null;
  const cleaned = raw.replace(/[^\d+]/g, "");

  if (cleaned.startsWith("+")) {
    const digits = "+" + cleaned.slice(1).replace(/\D/g, "");
    if (!/^\+\d{8,15}$/.test(digits)) return null;
    return digits;
  }

  const digits = cleaned.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("0")) {
    // Nigerian local format: 080... -> +23480...
    return "+234" + digits.slice(1);
  }
  if (digits.length === 13 && digits.startsWith("234")) {
    return "+" + digits;
  }

  return null;
}

function normalizeEmail(input: string | undefined) {
  const value = input?.trim().toLowerCase();
  if (!value) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return null;
  return value;
}

function normalizeWalletAddress(input: string | undefined) {
  const value = input?.trim();
  if (!value) return null;
  return value.toLowerCase();
}

function fallbackPrivyPhone(privyUserId: string) {
  return `privy:${privyUserId.replace(/[^a-zA-Z0-9:._-]/g, "_")}`;
}

function otpHash(phone: string, code: string) {
  const secret = process.env.NT_OTP_SECRET || process.env.NT_SESSION_SECRET || "dev_otp_secret_change_me";
  return crypto
    .createHash("sha256")
    .update(`${secret}:${phone}:${code}`)
    .digest("hex");
}

function safeEqual(a: string, b: string) {
  const aa = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (aa.length !== bb.length) return false;
  return crypto.timingSafeEqual(aa, bb);
}

function normalizeReferralCode(input: string) {
  const raw = input.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!raw) return null;
  if (raw.length < 6 || raw.length > 16) return null;
  return raw;
}

function findUserByReferralCode(data: AdminData, code: string) {
  const normalized = normalizeReferralCode(code);
  if (!normalized) return null;
  return (
    data.users.find(
      (user) => normalizeReferralCode(user.referralCode ?? "") === normalized
    ) ?? null
  );
}

function findUserByReferralHandle(data: AdminData, input: string) {
  const normalized = normalizeHandle(input);
  if (!isValidHandle(normalized)) return null;

  const claim = data.claims.find((entry) => entry.handle === normalized);
  if (!claim?.userId) return null;

  return data.users.find((entry) => entry.id === claim.userId) ?? null;
}

function findUserByReferralIdentifier(data: AdminData, input: string) {
  return findUserByReferralHandle(data, input) ?? findUserByReferralCode(data, input);
}

function referralTotalPoints(referral: ReferralRecord) {
  return (referral.signupPoints ?? 0) + (referral.conversionPoints ?? 0);
}

function generateOtpCode() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

function bankEncryptionKey() {
  const secret =
    process.env.NT_BANK_ENCRYPTION_SECRET ||
    process.env.NT_SESSION_SECRET ||
    "dev_bank_encryption_secret_change_me";

  return crypto.createHash("sha256").update(secret).digest();
}

function encryptSensitiveValue(value: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", bankEncryptionKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, authTag, ciphertext]).toString("base64url");
}

function decryptSensitiveValue(value: string) {
  const payload = Buffer.from(value, "base64url");
  const iv = payload.subarray(0, 12);
  const authTag = payload.subarray(12, 28);
  const ciphertext = payload.subarray(28);
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    bankEncryptionKey(),
    iv
  );
  decipher.setAuthTag(authTag);

  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");
}

function maskAccountNumber(accountNumber: string) {
  return `******${accountNumber.slice(-4)}`;
}

export async function requestPhoneOtp({
  phone,
  ip,
  userAgent,
}: {
  phone: string;
  ip?: string;
  userAgent?: string;
}) {
  const normalized = normalizePhone(phone);
  if (!normalized) throw new Error("invalid_phone");

  return enqueue(async () => {
    const data = await readDataUnsafe();

    // Soft throttle: if the latest OTP is still fresh (<30s), reuse it.
    const now = Date.now();
    const latest = data.otps.find(
      (o) => o.phone === normalized && !o.consumedAt
    );
    if (latest) {
      const ageMs = now - Date.parse(latest.createdAt);
      if (ageMs < 30_000) {
        return {
          phone: normalized,
          devCode:
            process.env.NODE_ENV !== "production" ? latest.devCode : undefined,
        };
      }
    }

    const code = generateOtpCode();
    const record: OtpRecord = {
      id: newId("otp"),
      phone: normalized,
      codeHash: otpHash(normalized, code),
      createdAt: new Date().toISOString(),
      expiresAt: new Date(now + OTP_TTL_MS).toISOString(),
      attempts: 0,
      ip,
      userAgent,
      devCode: process.env.NODE_ENV !== "production" ? code : undefined,
    } as OtpRecord;

    data.otps.unshift(record);
    data.otps = data.otps.slice(0, 5000);
    const user = data.users.find((entry) => entry.phone === normalized);
    addNotificationUnsafe(data, {
      userId: user?.id,
      type: "otp_requested",
      title: "OTP requested",
      body: "A sign-in code was requested for this phone number.",
      priority: "low",
      metadata: {
        phone: normalized,
        otpId: record.id,
      },
    });
    await writeDataUnsafe(data);

    return {
      phone: normalized,
      devCode: process.env.NODE_ENV !== "production" ? code : undefined,
    };
  });
}

export async function verifyPhoneOtp({
  phone,
  code,
  ip,
}: {
  phone: string;
  code: string;
  ip?: string;
}) {
  const normalized = normalizePhone(phone);
  const otp = code.trim();
  if (!normalized) throw new Error("invalid_phone");
  if (!/^\d{6}$/.test(otp)) throw new Error("invalid_code");

  return enqueue(async () => {
    const data = await readDataUnsafe();
    const now = new Date();

    const record = data.otps.find(
      (o) => o.phone === normalized && !o.consumedAt
    );
    if (!record) throw new Error("otp_not_found");
    if (Date.parse(record.expiresAt) < now.getTime()) throw new Error("otp_expired");
    if (record.attempts >= OTP_MAX_ATTEMPTS) throw new Error("otp_locked");

    record.attempts += 1;
    record.lastAttemptAt = now.toISOString();
    if (ip && !record.ip) record.ip = ip;

    const ok = safeEqual(record.codeHash, otpHash(normalized, otp));
    if (!ok) {
      await writeDataUnsafe(data);
      throw new Error("otp_invalid");
    }

    record.consumedAt = now.toISOString();

    let user = data.users.find((u) => u.phone === normalized);
    if (!user) {
      user = {
        id: newId("usr"),
        phone: normalized,
        createdAt: now.toISOString(),
        phoneVerifiedAt: now.toISOString(),
        geo: ip ? { ip } : undefined,
      };
      data.users.unshift(user);
    } else {
      user.phoneVerifiedAt = user.phoneVerifiedAt || now.toISOString();
      user.geo = user.geo || (ip ? { ip } : undefined);
    }

    await writeDataUnsafe(data);
    return user;
  });
}

export async function upsertPrivyUser({
  privyUserId,
  phone,
  email,
  walletAddress,
  fullName,
  ip,
}: {
  privyUserId: string;
  phone?: string;
  email?: string;
  walletAddress?: string;
  fullName?: string;
  ip?: string;
}) {
  const cleanPrivyUserId = privyUserId.trim();
  if (!cleanPrivyUserId) throw new Error("invalid_privy_user");

  const normalizedPhone = phone ? normalizePhone(phone) : null;
  const normalizedEmail = normalizeEmail(email);
  const normalizedWalletAddress = normalizeWalletAddress(walletAddress);
  const cleanName = fullName?.trim();

  return enqueue(async () => {
    const data = await readDataUnsafe();
    const nowIso = new Date().toISOString();

    let user =
      data.users.find((entry) => entry.privyUserId === cleanPrivyUserId) ??
      null;

    if (!user && normalizedPhone) {
      user = data.users.find((entry) => entry.phone === normalizedPhone) ?? null;
    }

    if (!user && normalizedEmail) {
      user =
        data.users.find(
          (entry) => entry.email?.toLowerCase() === normalizedEmail
        ) ?? null;
    }

    if (!user && normalizedWalletAddress) {
      user =
        data.users.find(
          (entry) =>
            entry.walletAddress?.toLowerCase() === normalizedWalletAddress
        ) ?? null;
    }

    if (!user) {
      user = {
        id: newId("usr"),
        phone: normalizedPhone ?? fallbackPrivyPhone(cleanPrivyUserId),
        createdAt: nowIso,
        phoneVerifiedAt: nowIso,
        privyUserId: cleanPrivyUserId,
        privyLinkedAt: nowIso,
        email: normalizedEmail ?? undefined,
        walletAddress: normalizedWalletAddress ?? undefined,
        fullName: cleanName || undefined,
        geo: ip ? { ip } : undefined,
      };
      data.users.unshift(user);
    } else {
      user.privyUserId = cleanPrivyUserId;
      user.privyLinkedAt = user.privyLinkedAt || nowIso;
      user.phoneVerifiedAt = user.phoneVerifiedAt || nowIso;
      user.geo = user.geo || (ip ? { ip } : undefined);
      if (normalizedPhone && user.phone !== normalizedPhone) {
        const currentUserId = user.id;
        const phoneOwner = data.users.find(
          (entry) => entry.id !== currentUserId && entry.phone === normalizedPhone
        );
        if (!phoneOwner) user.phone = normalizedPhone;
      }
      if (normalizedEmail) user.email = normalizedEmail;
      if (normalizedWalletAddress) user.walletAddress = normalizedWalletAddress;
      if (cleanName && !user.fullName) user.fullName = cleanName;
    }

    await writeDataUnsafe(data);
    return user;
  });
}

export async function getUserById(userId: string) {
  return enqueue(async () => {
    const data = await readDataUnsafe();
    return data.users.find((u) => u.id === userId) ?? null;
  });
}

export async function getClaimByUserId(userId: string) {
  return enqueue(async () => {
    const data = await readDataUnsafe();
    return data.claims.find((claim) => claim.userId === userId) ?? null;
  });
}

export async function getBankAccountForUser(userId: string) {
  return enqueue(async () => {
    const data = await readDataUnsafe();
    return (
      data.bankAccounts
        .filter((account) => account.userId === userId)
        .sort((a, b) => Date.parse(b.linkedAt) - Date.parse(a.linkedAt))[0] ??
      null
    );
  });
}

export async function getClaimByHandle(handle: string) {
  const normalized = normalizeHandle(handle);
  if (!normalized) return null;

  return enqueue(async () => {
    const data = await readDataUnsafe();
    return data.claims.find((claim) => claim.handle === normalized) ?? null;
  });
}

export async function getPaymentDestinationByHandle(handle: string) {
  const normalized = normalizeHandle(handle);
  if (!normalized) return null;

  return enqueue(async () => {
    const data = await readDataUnsafe();
    const claim = data.claims.find((entry) => entry.handle === normalized);
    if (!claim) return null;

    const bankAccount = claim.userId
      ? data.bankAccounts.find((entry) => entry.userId === claim.userId) ?? null
      : null;

    return {
      claim,
      bankAccount: bankAccount
        ? {
            ...bankAccount,
            accountNumber: decryptSensitiveValue(bankAccount.accountNumberEncrypted),
          }
        : null,
    };
  });
}

function addTransactionNotificationsUnsafe({
  data,
  claim,
  transaction,
  previousStatus,
}: {
  data: AdminData;
  claim: ClaimRecord;
  transaction: TransactionRecord;
  previousStatus?: TransactionRecord["status"];
}) {
  if (previousStatus === transaction.status) return;

  const amountLabel = transaction.amount.toLocaleString();
  if (transaction.status === "settled") {
    addNotificationUnsafe(data, {
      userId: claim.userId,
      handle: claim.handle,
      type: "payment_received",
      title: "Payment received",
      body: `${transaction.senderName || "A sender"} paid NGN ${amountLabel} to \u20A6${claim.handle}.`,
      metadata: {
        transactionId: transaction.id,
        amount: transaction.amount,
        channel: transaction.channel,
      },
    });
  } else if (transaction.status === "failed") {
    addNotificationUnsafe(data, {
      userId: claim.userId,
      handle: claim.handle,
      type: "payment_failed",
      title: "Payment failed",
      body: `A NGN ${amountLabel} payment to \u20A6${claim.handle} failed.`,
      priority: "high",
      metadata: {
        transactionId: transaction.id,
        amount: transaction.amount,
        channel: transaction.channel,
      },
    });
  } else if (transaction.status === "disputed") {
    addNotificationUnsafe(data, {
      userId: claim.userId,
      handle: claim.handle,
      type: "payment_disputed",
      title: "Payment disputed",
      body: `A NGN ${amountLabel} payment to \u20A6${claim.handle} has a dispute signal.`,
      priority: "high",
      metadata: {
        transactionId: transaction.id,
        amount: transaction.amount,
        channel: transaction.channel,
      },
    });
    addNotificationUnsafe(data, {
      handle: claim.handle,
      type: "suspicious_activity",
      title: "Dispute review needed",
      body: `Review disputed payment ${transaction.id} for \u20A6${claim.handle}.`,
      priority: "high",
      metadata: {
        transactionId: transaction.id,
        amount: transaction.amount,
      },
    });
  }

  const highValueThreshold = Number(process.env.NT_HIGH_VALUE_REVIEW_AMOUNT ?? "500000");
  if (transaction.amount >= highValueThreshold || transaction.status === "pending") {
    addNotificationUnsafe(data, {
      handle: claim.handle,
      type: "admin_review_required",
      title: "Payment review signal",
      body: `${transaction.status === "pending" ? "Pending" : "High-value"} payment of NGN ${amountLabel} for \u20A6${claim.handle}.`,
      priority: transaction.amount >= highValueThreshold ? "high" : "normal",
      metadata: {
        transactionId: transaction.id,
        amount: transaction.amount,
        status: transaction.status,
      },
    });
  }
}

export async function recordTransaction({
  handle,
  amount,
  status = "pending",
  channel = "payment_link",
  counterpartyHandle,
  reference,
  note,
  senderName,
  senderPhone,
  metadata,
}: {
  handle: string;
  amount: number;
  status?: TransactionRecord["status"];
  channel?: TransactionRecord["channel"];
  counterpartyHandle?: string;
  reference?: string;
  note?: string;
  senderName?: string;
  senderPhone?: string;
  metadata?: TransactionRecord["metadata"];
}) {
  const normalizedHandle = normalizeHandle(handle);
  const normalizedCounterparty = counterpartyHandle
    ? normalizeHandle(counterpartyHandle)
    : undefined;
  const normalizedAmount = Math.round(amount);
  const normalizedReference = reference?.trim() || undefined;

  if (!normalizedHandle) throw new Error("missing_handle");
  if (!isValidHandle(normalizedHandle)) throw new Error("invalid_handle");
  if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
    throw new Error("invalid_amount");
  }

  return enqueue(async () => {
    const data = await readDataUnsafe();
    const claim = data.claims.find((entry) => entry.handle === normalizedHandle);
    if (!claim) throw new Error("handle_not_found");

    const nowIso = new Date().toISOString();
    const existingTransaction = normalizedReference
      ? data.transactions.find(
          (entry) =>
            entry.handle === normalizedHandle && entry.reference === normalizedReference
        )
      : null;

    if (existingTransaction) {
      const previousStatus = existingTransaction.status;
      existingTransaction.amount = normalizedAmount;
      existingTransaction.status = status;
      existingTransaction.channel = channel;
      existingTransaction.counterpartyHandle = normalizedCounterparty;
      existingTransaction.note = note?.trim() || existingTransaction.note;
      existingTransaction.senderName =
        senderName?.trim() || existingTransaction.senderName;
      existingTransaction.senderPhone =
        senderPhone?.trim() || existingTransaction.senderPhone;
      existingTransaction.settledAt =
        status === "settled" ? existingTransaction.settledAt ?? nowIso : undefined;
      existingTransaction.disputedAt =
        status === "disputed" ? existingTransaction.disputedAt ?? nowIso : undefined;
      existingTransaction.metadata = {
        ...existingTransaction.metadata,
        ...metadata,
      };

      addTransactionNotificationsUnsafe({
        data,
        claim,
        transaction: existingTransaction,
        previousStatus,
      });

      await writeDataUnsafe(data);
      return existingTransaction;
    }

    const transaction: TransactionRecord = {
      id: newId("txn"),
      handle: normalizedHandle,
      userId: claim.userId,
      counterpartyHandle: normalizedCounterparty,
      amount: normalizedAmount,
      currency: "NGN",
      channel,
      status,
      reference: normalizedReference,
      note: note?.trim() || undefined,
      senderName: senderName?.trim() || undefined,
      senderPhone: senderPhone?.trim() || undefined,
      recordedAt: nowIso,
      settledAt: status === "settled" ? nowIso : undefined,
      disputedAt: status === "disputed" ? nowIso : undefined,
      metadata,
    };

    data.transactions.unshift(transaction);
    if (data.transactions.length > 20_000) {
      data.transactions = data.transactions.slice(0, 20_000);
    }

    addTransactionNotificationsUnsafe({ data, claim, transaction });

    await writeDataUnsafe(data);
    return transaction;
  });
}

export async function listTransactions({
  limit = 25,
  offset = 0,
  handle,
  userId,
}: {
  limit?: number;
  offset?: number;
  handle?: string;
  userId?: string;
}) {
  const normalizedHandle = handle ? normalizeHandle(handle) : undefined;

  return enqueue(async () => {
    const data = await readDataUnsafe();
    const filtered = data.transactions.filter((transaction) => {
      if (normalizedHandle && transaction.handle !== normalizedHandle) return false;
      if (userId && transaction.userId !== userId) return false;
      return true;
    });

    return {
      total: filtered.length,
      items: filtered.slice(offset, offset + limit),
    };
  });
}

export async function getTransactionsForHandle(handle: string) {
  const normalized = normalizeHandle(handle);
  if (!normalized) return [];

  return enqueue(async () => {
    const data = await readDataUnsafe();
    return data.transactions.filter((transaction) => transaction.handle === normalized);
  });
}

export async function getHandleReputation(handle: string) {
  const normalized = normalizeHandle(handle);
  if (!normalized) return null;

  return enqueue(async () => {
    const data = await readDataUnsafe();
    const claim = data.claims.find((entry) => entry.handle === normalized) ?? null;
    return buildHandleReputation(data, claim);
  });
}

export async function getCreditProfileForHandle(handle: string) {
  const normalized = normalizeHandle(handle);
  if (!normalized) return null;

  return enqueue(async () => {
    const data = await readDataUnsafe();
    const claim = data.claims.find((entry) => entry.handle === normalized) ?? null;
    return buildCreditProfile(data, claim);
  });
}

export async function getPublicHandleProfile(handle: string) {
  const normalized = normalizeHandle(handle);
  if (!normalized) return null;

  return enqueue(async () => {
    const data = await readDataUnsafe();
    const claim = data.claims.find((entry) => entry.handle === normalized) ?? null;
    return buildPublicHandleProfile(data, claim);
  });
}

export async function getHandleReputations(handles: string[]) {
  const normalizedHandles = Array.from(
    new Set(handles.map((handle) => normalizeHandle(handle)).filter(Boolean))
  );

  return enqueue(async () => {
    const data = await readDataUnsafe();
    return Object.fromEntries(
      normalizedHandles.map((handle) => {
        const claim = data.claims.find((entry) => entry.handle === handle) ?? null;
        return [handle, buildHandleReputation(data, claim)];
      })
    ) as Record<string, HandleReputation | null>;
  });
}

export async function getMarketplaceStats(): Promise<MarketplaceStats> {
  return enqueue(async () => {
    const data = await readDataUnsafe();
    const liveListings = data.marketplaceListings.filter(
      (listing) => listing.status === "active"
    );
    const underReviewListings = data.marketplaceListings.filter(
      (listing) => listing.status === "under_review"
    ).length;
    const pendingTransfers = data.marketplaceTransfers.filter(
      (transfer) => transfer.status === "pending_review"
    ).length;
    const approvedTransfers = data.marketplaceTransfers.filter(
      (transfer) => transfer.status === "approved"
    ).length;
    const pendingOffers = data.marketplaceOffers.filter(
      (offer) => offer.status === "pending"
    );
    const pricedListings = liveListings.filter((listing) => listing.askAmount != null);
    const averageAskAmount =
      pricedListings.length === 0
        ? null
        : Math.round(
            pricedListings.reduce((sum, listing) => sum + (listing.askAmount ?? 0), 0) /
              pricedListings.length
          );
    const averageOfferAmount =
      pendingOffers.length === 0
        ? null
        : Math.round(
            pendingOffers.reduce((sum, offer) => sum + offer.amount, 0) /
              pendingOffers.length
          );

    return {
      liveListings: liveListings.length,
      underReviewListings,
      pendingTransfers,
      approvedTransfers,
      totalOffers: data.marketplaceOffers.length,
      pendingOffers: pendingOffers.length,
      averageAskAmount,
      averageOfferAmount,
    };
  });
}

export async function listMarketplaceListings({
  limit = 24,
  offset = 0,
  q,
  statuses = ["active"] as MarketplaceListingStatus[],
}: {
  limit?: number;
  offset?: number;
  q?: string;
  statuses?: MarketplaceListingStatus[];
}) {
  return enqueue(async () => {
    const data = await readDataUnsafe();
    const query = q?.trim().toLowerCase() || "";
    const allowedStatuses = new Set(statuses);
    const filtered = data.marketplaceListings
      .filter((listing) => allowedStatuses.has(listing.status))
      .filter((listing) => {
        const claim = data.claims.find((entry) => entry.handle === listing.handle);
        if (!query) return true;
        return Boolean(
          listing.handle.includes(query) ||
            claim?.displayName.toLowerCase().includes(query) ||
            listing.sellerNote?.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));

    const items = filtered
      .map((listing) => buildMarketplaceListingView(data, listing))
      .filter(Boolean) as MarketplaceListingView[];

    return {
      total: items.length,
      items: items.slice(offset, offset + limit),
    };
  });
}

export async function getMarketplaceListingByHandle(handle: string) {
  const normalized = normalizeHandle(handle);
  if (!normalized) return null;

  return enqueue(async () => {
    const data = await readDataUnsafe();
    const listing =
      data.marketplaceListings.find((entry) => entry.handle === normalized) ?? null;
    if (!listing) return null;
    if (!["active", "under_review"].includes(listing.status)) return null;
    return buildMarketplaceListingDetail(data, listing);
  });
}

export async function getMarketplaceDashboardForUser(userId?: string) {
  return enqueue(async () => {
    const data = await readDataUnsafe();
    const claim = userId
      ? data.claims.find((entry) => entry.userId === userId) ?? null
      : null;
    const bankAccount = userId ? latestBankAccountForUser(data, userId) : null;
    const listing = claim
      ? data.marketplaceListings.find(
          (entry) =>
            entry.sellerUserId === userId &&
            entry.handle === claim.handle &&
            ["active", "paused", "under_review"].includes(entry.status)
        ) ?? null
      : null;
    const listingDetail = listing ? buildMarketplaceListingDetail(data, listing) : null;
    const user = userId ? data.users.find((entry) => entry.id === userId) ?? null : null;
    const transfers = userId
      ? data.marketplaceTransfers
          .filter(
            (transfer) =>
              transfer.sellerUserId === userId ||
              transfer.buyerUserId === userId ||
              transfer.buyerPhone === user?.phone
          )
          .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
          .map((transfer) => buildMarketplaceTransferDetail(data, transfer))
          .filter(Boolean) as MarketplaceTransferDetail[]
      : [];

    return {
      eligibility: buildMarketplaceEligibility(data, userId),
      claim,
      bankAccount,
      listing: listingDetail,
      creditProfile: buildCreditProfile(data, claim),
      transfers,
      notifications: userId
        ? data.notifications
            .filter((notification) =>
              notificationAudienceMatches(notification, userId, claim?.handle)
            )
            .slice(0, 8)
        : [],
    };
  });
}

export async function applyReferralCodeForUser({
  userId,
  referralCode,
  source = "link",
}: {
  userId: string;
  referralCode: string;
  source?: ReferralSource;
}) {
  const normalizedHandle = normalizeHandle(referralCode);
  const normalizedCode = normalizeReferralCode(referralCode);
  const referralIdentifier =
    normalizedHandle && isValidHandle(normalizedHandle)
      ? normalizedHandle
      : normalizedCode;

  if (!referralIdentifier) {
    return { applied: false as const, reason: "invalid_code" as const };
  }

  return enqueue(async () => {
    const data = await readDataUnsafe();
    const user = data.users.find((entry) => entry.id === userId) ?? null;
    if (!user) throw new Error("user_not_found");

    if (user.referredByUserId) {
      return { applied: false as const, reason: "already_referred" as const };
    }

    const referrer = findUserByReferralIdentifier(data, referralIdentifier);
    if (!referrer) {
      return { applied: false as const, reason: "unknown_code" as const };
    }
    if (referrer.id === userId) {
      return { applied: false as const, reason: "self_referral" as const };
    }

    const nowIso = new Date().toISOString();
    user.referredByUserId = referrer.id;
    user.referredAt = nowIso;

    const existing = data.referrals.find((entry) => entry.referredUserId === userId);
    const record: ReferralRecord = existing ?? {
      id: newId("ref"),
      referrerUserId: referrer.id,
      referredUserId: userId,
      referralCode: referralIdentifier,
      source,
      createdAt: nowIso,
      signupPoints: REFERRAL_SIGNUP_POINTS,
      conversionPoints: 0,
    };
    if (!existing) {
      data.referrals.unshift(record);
      const referrerClaim =
        data.claims.find((entry) => entry.userId === referrer.id) ?? null;
      addNotificationUnsafe(data, {
        userId: referrer.id,
        handle: referrerClaim?.handle,
        type: "referral_signup",
        title: `New referral: +${REFERRAL_SIGNUP_POINTS} points`,
        body: "Someone signed up with your username referral link.",
        metadata: {
          referralId: record.id,
          referredUserId: userId,
          referralCode: referralIdentifier,
          points: REFERRAL_SIGNUP_POINTS,
          totalReferralPoints: referralTotalPoints(record),
        },
      });
    }

    await writeDataUnsafe(data);
    return { applied: true as const, reason: "applied" as const, referral: record };
  });
}

export async function getReferralDashboardForUser(userId: string) {
  return enqueue(async () => {
    const data = await readDataUnsafe();
    const user = data.users.find((entry) => entry.id === userId) ?? null;
    if (!user) throw new Error("user_not_found");

    const userClaim = data.claims.find((entry) => entry.userId === userId) ?? null;
    const referralHandle = userClaim?.handle ?? null;
    const referralUrl = referralHandle
      ? absoluteOrRelativeUrl(`/r/${referralHandle}`)
      : "";

    const referrals = data.referrals
      .filter((entry) => entry.referrerUserId === userId)
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    const convertedReferrals = referrals.filter((entry) => Boolean(entry.convertedAt))
      .length;
    const referralPoints = referrals.reduce(
      (sum, entry) => sum + referralTotalPoints(entry),
      0
    );
    const pendingConversionPoints =
      referrals.filter((entry) => !entry.convertedAt).length *
      REFERRAL_CONVERSION_POINTS;

    const recent = referrals.slice(0, 8).map((entry) => {
      const referredUser =
        data.users.find((u) => u.id === entry.referredUserId) ?? null;
      const referredClaim =
        data.claims.find((c) => c.userId === entry.referredUserId) ?? null;
      return {
        id: entry.id,
        createdAt: entry.createdAt,
        convertedAt: entry.convertedAt,
        points: referralTotalPoints(entry),
        signupPoints: entry.signupPoints ?? 0,
        conversionPoints: entry.conversionPoints ?? 0,
        referredName: referredUser?.fullName ?? null,
        referredHandle: referredClaim?.handle ?? null,
      };
    });

    return {
      referralCode: referralHandle ?? "",
      referralHandle,
      referralUrl,
      requiresHandle: !referralHandle,
      totalReferrals: referrals.length,
      convertedReferrals,
      referralPoints,
      pendingConversionPoints,
      signupPointsPerReferral: REFERRAL_SIGNUP_POINTS,
      conversionPointsPerReferral: REFERRAL_CONVERSION_POINTS,
      recent,
    };
  });
}

export async function listReferrals({
  limit = 25,
  offset = 0,
  q,
}: {
  limit?: number;
  offset?: number;
  q?: string;
}) {
  return enqueue(async () => {
    const data = await readDataUnsafe();
    const query = q ? q.trim().toLowerCase() : "";

    const filtered = query
      ? data.referrals.filter((referral) => {
          const referrer = data.users.find((u) => u.id === referral.referrerUserId);
          const referred = data.users.find((u) => u.id === referral.referredUserId);
          const referrerClaim = referrer
            ? data.claims.find((c) => c.userId === referrer.id)
            : null;
          const referredClaim = referred
            ? data.claims.find((c) => c.userId === referred.id)
            : null;
          return (
            referral.referralCode.toLowerCase().includes(query) ||
            (referrer?.phone ?? "").toLowerCase().includes(query) ||
            (referrer?.fullName ?? "").toLowerCase().includes(query) ||
            (referred?.phone ?? "").toLowerCase().includes(query) ||
            (referred?.fullName ?? "").toLowerCase().includes(query) ||
            (referrerClaim?.handle ?? "").includes(query) ||
            (referredClaim?.handle ?? "").includes(query)
          );
        })
      : data.referrals;

    const items = filtered
      .slice()
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .map((referral) => {
        const referrer = data.users.find((u) => u.id === referral.referrerUserId) ?? null;
        const referred = data.users.find((u) => u.id === referral.referredUserId) ?? null;
        const referrerClaim = referrer
          ? data.claims.find((c) => c.userId === referrer.id) ?? null
          : null;
        const referredClaim = referred
          ? data.claims.find((c) => c.userId === referred.id) ?? null
          : null;

        return {
          ...referral,
          points: referralTotalPoints(referral),
          signupPoints: referral.signupPoints ?? 0,
          conversionPoints: referral.conversionPoints ?? 0,
          referrer,
          referred,
          referrerHandle: referrerClaim?.handle ?? null,
          referredHandle: referredClaim?.handle ?? null,
        };
      });

    return {
      total: items.length,
      items: items.slice(offset, offset + limit),
    };
  });
}

export async function createMarketplaceListing({
  userId,
  handle,
  saleMode,
  askAmount,
  minOfferAmount,
  sellerNote,
}: {
  userId: string;
  handle: string;
  saleMode: MarketplaceListingRecord["saleMode"];
  askAmount?: number;
  minOfferAmount?: number;
  sellerNote?: string;
}) {
  const normalizedHandle = normalizeHandle(handle);
  const normalizedAsk = askAmount == null ? undefined : Math.round(askAmount);
  const normalizedMinOffer =
    minOfferAmount == null ? undefined : Math.round(minOfferAmount);

  if (!normalizedHandle) throw new Error("missing_handle");
  if (!isValidHandle(normalizedHandle)) throw new Error("invalid_handle");
  if (!["fixed_price", "offers_only"].includes(saleMode)) {
    throw new Error("invalid_sale_mode");
  }
  if (saleMode === "fixed_price" && (!normalizedAsk || normalizedAsk <= 0)) {
    throw new Error("invalid_ask_amount");
  }
  if (normalizedMinOffer != null && normalizedMinOffer <= 0) {
    throw new Error("invalid_min_offer_amount");
  }

  return enqueue(async () => {
    const data = await readDataUnsafe();
    const eligibility = buildMarketplaceEligibility(data, userId);
    const claim = data.claims.find((entry) => entry.userId === userId);

    if (!claim || claim.handle !== normalizedHandle) {
      throw new Error("handle_not_owned");
    }
    if (!eligibility.eligible) {
      throw new Error(`marketplace_${eligibility.reason}`);
    }

    const nowIso = new Date().toISOString();
    const existingListing = data.marketplaceListings.find(
      (entry) => entry.handle === normalizedHandle && entry.sellerUserId === userId
    );
    const listing: MarketplaceListingRecord = existingListing
      ? {
          ...existingListing,
          saleMode,
          askAmount: normalizedAsk,
          minOfferAmount: normalizedMinOffer,
          status: "active",
          sellerNote: sellerNote?.trim() || undefined,
          commissionBps: MARKETPLACE_COMMISSION_BPS,
          updatedAt: nowIso,
          publishedAt: nowIso,
          reviewStartedAt: undefined,
          withdrawnAt: undefined,
        }
      : {
          id: newId("mkt"),
          handle: normalizedHandle,
          sellerUserId: userId,
          saleMode,
          askAmount: normalizedAsk,
          minOfferAmount: normalizedMinOffer,
          status: "active",
          sellerNote: sellerNote?.trim() || undefined,
          commissionBps: MARKETPLACE_COMMISSION_BPS,
          createdAt: nowIso,
          updatedAt: nowIso,
          publishedAt: nowIso,
        };

    if (existingListing) {
      data.marketplaceListings = data.marketplaceListings.filter(
        (entry) => entry.id !== existingListing.id
      );
    }
    data.marketplaceListings.unshift(listing);
    await writeDataUnsafe(data);

    return buildMarketplaceListingDetail(data, listing);
  });
}

export async function updateMarketplaceListing({
  userId,
  handle,
  status,
  askAmount,
  minOfferAmount,
  sellerNote,
}: {
  userId: string;
  handle: string;
  status?: MarketplaceListingStatus;
  askAmount?: number | null;
  minOfferAmount?: number | null;
  sellerNote?: string | null;
}) {
  const normalizedHandle = normalizeHandle(handle);
  if (!normalizedHandle) throw new Error("missing_handle");

  return enqueue(async () => {
    const data = await readDataUnsafe();
    const listing = data.marketplaceListings.find(
      (entry) =>
        entry.handle === normalizedHandle &&
        entry.sellerUserId === userId &&
        ["active", "paused", "under_review"].includes(entry.status)
    );
    if (!listing) throw new Error("listing_not_found");

    if (status && !["active", "paused", "withdrawn"].includes(status)) {
      throw new Error("invalid_listing_status");
    }
    if (
      listing.status === "under_review" &&
      (status ? status !== "withdrawn" : askAmount !== undefined || minOfferAmount !== undefined || sellerNote !== undefined)
    ) {
      throw new Error("listing_locked_for_review");
    }

    if (askAmount !== undefined) {
      const normalizedAsk = askAmount == null ? undefined : Math.round(askAmount);
      if (listing.saleMode === "fixed_price" && (!normalizedAsk || normalizedAsk <= 0)) {
        throw new Error("invalid_ask_amount");
      }
      listing.askAmount = normalizedAsk;
    }
    if (minOfferAmount !== undefined) {
      const normalizedMin =
        minOfferAmount == null ? undefined : Math.round(minOfferAmount);
      if (normalizedMin != null && normalizedMin <= 0) {
        throw new Error("invalid_min_offer_amount");
      }
      listing.minOfferAmount = normalizedMin;
    }
    if (sellerNote !== undefined) {
      listing.sellerNote = sellerNote?.trim() || undefined;
    }
    if (status) {
      listing.status = status;
      if (status === "withdrawn") {
        listing.withdrawnAt = new Date().toISOString();
      }
      if (status === "active") {
        listing.reviewStartedAt = undefined;
      }
    }
    listing.updatedAt = new Date().toISOString();

    await writeDataUnsafe(data);
    return buildMarketplaceListingDetail(data, listing);
  });
}

export async function submitMarketplaceOffer({
  handle,
  buyerName,
  buyerPhone,
  amount,
  note,
  buyerUserId,
}: {
  handle: string;
  buyerName: string;
  buyerPhone: string;
  amount: number;
  note?: string;
  buyerUserId?: string;
}) {
  const normalizedHandle = normalizeHandle(handle);
  const normalizedPhone = normalizePhone(buyerPhone);
  const normalizedAmount = Math.round(amount);

  if (!normalizedHandle) throw new Error("missing_handle");
  if (!buyerName.trim()) throw new Error("missing_buyer_name");
  if (!normalizedPhone) throw new Error("invalid_buyer_phone");
  if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
    throw new Error("invalid_offer_amount");
  }

  return enqueue(async () => {
    const data = await readDataUnsafe();
    const listing = data.marketplaceListings.find(
      (entry) => entry.handle === normalizedHandle && entry.status === "active"
    );
    if (!listing) throw new Error("listing_not_found");
    if (buyerUserId && buyerUserId === listing.sellerUserId) {
      throw new Error("seller_cannot_buy_own_handle");
    }

    const minAmount = listing.minOfferAmount ?? 0;
    if (normalizedAmount < minAmount) {
      throw new Error("offer_below_minimum");
    }

    const nowIso = new Date().toISOString();
    const existingPendingOffer = data.marketplaceOffers.find(
      (offer) =>
        offer.listingId === listing.id &&
        offer.buyerPhone === normalizedPhone &&
        offer.status === "pending"
    );

    if (existingPendingOffer) {
      existingPendingOffer.amount = normalizedAmount;
      existingPendingOffer.note = note?.trim() || undefined;
      existingPendingOffer.updatedAt = nowIso;
      addNotificationUnsafe(data, {
        userId: listing.sellerUserId,
        handle: listing.handle,
        type: "marketplace_offer_submitted",
        title: "Offer updated",
        body: `${buyerName.trim()} updated an offer on \u20A6${listing.handle} to NGN ${normalizedAmount.toLocaleString()}.`,
        metadata: {
          listingId: listing.id,
          offerId: existingPendingOffer.id,
          amount: normalizedAmount,
        },
      });
      await writeDataUnsafe(data);
      return {
        listing: buildMarketplaceListingDetail(data, listing),
        offer: existingPendingOffer,
      };
    }

    const offer: MarketplaceOfferRecord = {
      id: newId("offer"),
      listingId: listing.id,
      handle: listing.handle,
      buyerUserId,
      buyerName: buyerName.trim(),
      buyerPhone: normalizedPhone,
      amount: normalizedAmount,
      note: note?.trim() || undefined,
      status: "pending",
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    data.marketplaceOffers.unshift(offer);
    addNotificationUnsafe(data, {
      userId: listing.sellerUserId,
      handle: listing.handle,
      type: "marketplace_offer_submitted",
      title: "New marketplace offer",
      body: `${offer.buyerName} offered NGN ${offer.amount.toLocaleString()} for \u20A6${listing.handle}.`,
      metadata: {
        listingId: listing.id,
        offerId: offer.id,
        amount: offer.amount,
      },
    });
    await writeDataUnsafe(data);

    return {
      listing: buildMarketplaceListingDetail(data, listing),
      offer,
    };
  });
}

export async function respondToMarketplaceOffer({
  userId,
  offerId,
  action,
}: {
  userId: string;
  offerId: string;
  action: "accept" | "reject";
}) {
  return enqueue(async () => {
    const data = await readDataUnsafe();
    const offer = data.marketplaceOffers.find((entry) => entry.id === offerId);
    if (!offer) throw new Error("offer_not_found");

    const listing = data.marketplaceListings.find(
      (entry) => entry.id === offer.listingId && entry.sellerUserId === userId
    );
    if (!listing) throw new Error("listing_not_found");
    if (offer.status !== "pending") throw new Error("offer_not_pending");

    const nowIso = new Date().toISOString();
    let transfer: MarketplaceTransferRecord | null = null;
    if (action === "accept") {
      offer.status = "accepted";
      offer.updatedAt = nowIso;
      offer.respondedAt = nowIso;
      listing.status = "under_review";
      listing.reviewStartedAt = nowIso;
      listing.updatedAt = nowIso;
      transfer = ensureMarketplaceTransferForOffer(data, listing, offer, nowIso);
      addNotificationUnsafe(data, {
        userId: offer.buyerUserId,
        handle: listing.handle,
        type: "marketplace_offer_accepted",
        title: "Offer accepted",
        body: `Your NGN ${offer.amount.toLocaleString()} offer for \u20A6${listing.handle} was accepted and moved to transfer review.`,
        metadata: {
          listingId: listing.id,
          offerId: offer.id,
          transferId: transfer.id,
          buyerPhone: offer.buyerPhone,
        },
      });
      addNotificationUnsafe(data, {
        handle: listing.handle,
        type: "admin_review_required",
        title: "Transfer review opened",
        body: `Review accepted offer for \u20A6${listing.handle} before ownership changes.`,
        priority: "high",
        metadata: {
          listingId: listing.id,
          offerId: offer.id,
          transferId: transfer.id,
          amount: offer.amount,
        },
      });

      for (const otherOffer of data.marketplaceOffers) {
        if (
          otherOffer.listingId === listing.id &&
          otherOffer.id !== offer.id &&
          otherOffer.status === "pending"
        ) {
          otherOffer.status = "rejected";
          otherOffer.updatedAt = nowIso;
          otherOffer.respondedAt = nowIso;
          addNotificationUnsafe(data, {
            userId: otherOffer.buyerUserId,
            handle: listing.handle,
            type: "marketplace_offer_rejected",
            title: "Offer closed",
            body: `Another offer was accepted for \u20A6${listing.handle}, so your pending offer was closed.`,
            metadata: {
              listingId: listing.id,
              offerId: otherOffer.id,
              buyerPhone: otherOffer.buyerPhone,
            },
          });
        }
      }
    } else {
      offer.status = "rejected";
      offer.updatedAt = nowIso;
      offer.respondedAt = nowIso;
      addNotificationUnsafe(data, {
        userId: offer.buyerUserId,
        handle: listing.handle,
        type: "marketplace_offer_rejected",
        title: "Offer rejected",
        body: `Your offer for \u20A6${listing.handle} was rejected.`,
        metadata: {
          listingId: listing.id,
          offerId: offer.id,
          buyerPhone: offer.buyerPhone,
        },
      });
    }

    await writeDataUnsafe(data);
    return {
      listing: buildMarketplaceListingDetail(data, listing),
      offer,
      transfer: transfer ? buildMarketplaceTransferDetail(data, transfer) : null,
    };
  });
}

export async function listMarketplaceTransfers({
  limit = 25,
  offset = 0,
  status,
  userId,
}: {
  limit?: number;
  offset?: number;
  status?: MarketplaceTransferStatus | MarketplaceTransferStatus[];
  userId?: string;
}) {
  return enqueue(async () => {
    const data = await readDataUnsafe();
    const statuses = Array.isArray(status)
      ? new Set(status)
      : status
        ? new Set([status])
        : null;
    const user = userId ? data.users.find((entry) => entry.id === userId) ?? null : null;
    const filtered = data.marketplaceTransfers
      .filter((transfer) => {
        if (statuses && !statuses.has(transfer.status)) return false;
        if (!userId) return true;
        return (
          transfer.sellerUserId === userId ||
          transfer.buyerUserId === userId ||
          transfer.buyerPhone === user?.phone
        );
      })
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    const items = filtered
      .map((transfer) => buildMarketplaceTransferDetail(data, transfer))
      .filter(Boolean) as MarketplaceTransferDetail[];

    return {
      total: items.length,
      items: items.slice(offset, offset + limit),
    };
  });
}

export async function reviewMarketplaceTransfer({
  transferId,
  action,
  reviewNote,
}: {
  transferId: string;
  action: "approve" | "reject";
  reviewNote?: string;
}) {
  return enqueue(async () => {
    const data = await readDataUnsafe();
    const transfer = data.marketplaceTransfers.find((entry) => entry.id === transferId);
    if (!transfer) throw new Error("transfer_not_found");
    if (transfer.status !== "pending_review") throw new Error("transfer_not_pending");

    const listing = data.marketplaceListings.find(
      (entry) => entry.id === transfer.listingId
    );
    if (!listing) throw new Error("listing_not_found");
    if (listing.sellerUserId !== transfer.sellerUserId) {
      throw new Error("seller_ownership_mismatch");
    }

    const offer = data.marketplaceOffers.find((entry) => entry.id === transfer.offerId);
    if (!offer) throw new Error("offer_not_found");
    if (offer.listingId !== listing.id) throw new Error("offer_listing_mismatch");

    const nowIso = new Date().toISOString();
    transfer.updatedAt = nowIso;
    transfer.reviewedAt = nowIso;
    transfer.reviewNote = reviewNote?.trim() || undefined;

    if (action === "approve") {
      const claim = data.claims.find((entry) => entry.handle === transfer.handle);
      if (!claim) throw new Error("claim_not_found");
      if (claim.userId !== transfer.sellerUserId) {
        throw new Error("seller_ownership_mismatch");
      }

      const buyer =
        (transfer.buyerUserId
          ? data.users.find((entry) => entry.id === transfer.buyerUserId) ?? null
          : null) ?? findUserByPhone(data, transfer.buyerPhone);
      if (!buyer) throw new Error("buyer_verification_required");
      const buyerBankAccount = latestBankAccountForUser(data, buyer.id);
      if (!buyerBankAccount) throw new Error("buyer_bank_link_required");

      const buyerExistingClaim =
        data.claims.find((entry) => entry.userId === buyer.id) ?? null;
      if (buyerExistingClaim && buyerExistingClaim.handle !== transfer.handle) {
        throw new Error("buyer_already_has_handle");
      }

      transfer.status = "approved";
      transfer.buyerUserId = buyer.id;
      transfer.transferredAt = nowIso;
      listing.status = "sold";
      listing.updatedAt = nowIso;
      listing.reviewStartedAt = undefined;
      offer.status = "accepted";
      offer.updatedAt = nowIso;
      offer.respondedAt = offer.respondedAt ?? nowIso;

      claim.userId = buyer.id;
      claim.phone = buyer.phone;
      claim.displayName = (buyer.fullName || transfer.buyerName).trim();
      claim.bank = buyerBankAccount.bankName;
      claim.verification = buyer.bvnLinkedAt ? "verified" : "pending";
      claim.verifiedAt = buyer.bvnLinkedAt ? nowIso : undefined;
      claim.claimedAt = nowIso;
      addNotificationUnsafe(data, {
        userId: transfer.sellerUserId,
        handle: transfer.handle,
        type: "marketplace_transfer_approved",
        title: "Transfer approved",
        body: `Transfer of \u20A6${transfer.handle} to ${transfer.buyerName} was approved.`,
        metadata: {
          transferId: transfer.id,
          listingId: listing.id,
          amount: transfer.amount,
        },
      });
      addNotificationUnsafe(data, {
        userId: buyer.id,
        handle: transfer.handle,
        type: "marketplace_transfer_approved",
        title: "Handle transfer approved",
        body: `\u20A6${transfer.handle} is now assigned to ${transfer.buyerName}.`,
        metadata: {
          transferId: transfer.id,
          listingId: listing.id,
          buyerPhone: transfer.buyerPhone,
        },
      });
    } else {
      transfer.status = "rejected";
      listing.status = "active";
      listing.updatedAt = nowIso;
      listing.reviewStartedAt = undefined;
      offer.status = "rejected";
      offer.updatedAt = nowIso;
      offer.respondedAt = nowIso;
      addNotificationUnsafe(data, {
        userId: transfer.sellerUserId,
        handle: transfer.handle,
        type: "marketplace_transfer_rejected",
        title: "Transfer rejected",
        body: `Transfer review for \u20A6${transfer.handle} was rejected. The listing is active again.`,
        priority: "high",
        metadata: {
          transferId: transfer.id,
          listingId: listing.id,
          amount: transfer.amount,
        },
      });
      addNotificationUnsafe(data, {
        userId: offer.buyerUserId,
        handle: transfer.handle,
        type: "marketplace_transfer_rejected",
        title: "Transfer rejected",
        body: `Transfer review for \u20A6${transfer.handle} was rejected.`,
        priority: "high",
        metadata: {
          transferId: transfer.id,
          listingId: listing.id,
          buyerPhone: transfer.buyerPhone,
        },
      });
    }

    await writeDataUnsafe(data);
    return buildMarketplaceTransferDetail(data, transfer);
  });
}

export async function claimHandleForUser({
  userId,
  handle,
}: {
  userId: string;
  handle: string;
}) {
  const normalized = normalizeHandle(handle);
  if (!normalized) throw new Error("missing_handle");
  if (!isValidHandle(normalized)) throw new Error("invalid_handle");

  return enqueue(async () => {
    const data = await readDataUnsafe();
    const user = data.users.find((u) => u.id === userId);
    if (!user) throw new Error("user_not_found");
    if (!user.phoneVerifiedAt) throw new Error("phone_not_verified");

    const already = data.claims.find((c) => c.userId === userId);
    if (already) {
      const err = new Error("user_already_has_handle");
      // @ts-expect-error attach a code for API routes
      err.code = "user_already_has_handle";
      throw err;
    }

    const exists = data.claims.some((c) => c.handle === normalized);
    if (exists) {
      const err = new Error("already_claimed");
      // @ts-expect-error attach a code for API routes
      err.code = "already_claimed";
      throw err;
    }

    const claimedAt = new Date().toISOString();
    const verification: Verification = user.bvnLinkedAt ? "verified" : "pending";
    const record: ClaimRecord = {
      id: newId("claim"),
      handle: normalized,
      displayName: (user.fullName || "Pending verification").trim(),
      bank: "Unlinked",
      verification,
      claimedAt,
      source: "web",
      userId,
      phone: user.phone,
      verifiedAt: verification === "pending" ? undefined : claimedAt,
    };

    data.claims.unshift(record);

    const referral = data.referrals.find((entry) => entry.referredUserId === userId);
    if (referral && !referral.convertedAt) {
      referral.convertedAt = claimedAt;
      referral.signupPoints =
        typeof referral.signupPoints === "number" && referral.signupPoints > 0
          ? referral.signupPoints
          : REFERRAL_SIGNUP_POINTS;
      referral.conversionPoints =
        typeof referral.conversionPoints === "number" &&
        referral.conversionPoints > 0
          ? referral.conversionPoints
          : REFERRAL_CONVERSION_POINTS;

      const referrerClaim =
        data.claims.find((entry) => entry.userId === referral.referrerUserId) ??
        null;
      addNotificationUnsafe(data, {
        userId: referral.referrerUserId,
        handle: referrerClaim?.handle,
        type: "referral_converted",
        title: `Referral converted: +${REFERRAL_CONVERSION_POINTS} points`,
        body: "Your referral claimed a NairaTag handle. The conversion bonus was added.",
        metadata: {
          referralId: referral.id,
          referredUserId: userId,
          referredHandle: normalized,
          referralCode: referral.referralCode,
          points: REFERRAL_CONVERSION_POINTS,
          totalReferralPoints: referralTotalPoints(referral),
        },
      });
    }
    await writeDataUnsafe(data);
    return record;
  });
}

export async function linkBvnForUser({
  userId,
  bvn,
  fullName,
}: {
  userId: string;
  bvn: string;
  fullName?: string;
}) {
  const clean = bvn.trim().replace(/\s+/g, "");
  if (!/^\d{11}$/.test(clean)) throw new Error("invalid_bvn");

  return enqueue(async () => {
    const data = await readDataUnsafe();
    const user = data.users.find((u) => u.id === userId);
    if (!user) throw new Error("user_not_found");

    const nowIso = new Date().toISOString();
    user.bvnLast4 = clean.slice(-4);
    user.bvnLinkedAt = nowIso;
    if (fullName && fullName.trim()) user.fullName = fullName.trim();

    const claim = data.claims.find((c) => c.userId === userId);
    if (claim) {
      claim.verification = claim.verification === "business" ? "business" : "verified";
      claim.verifiedAt = claim.verifiedAt || nowIso;
      if (user.fullName) claim.displayName = user.fullName;
    }

    addNotificationUnsafe(data, {
      userId,
      handle: claim?.handle,
      type: "bvn_linked",
      title: "BVN linked",
      body: "Identity verification is linked to your NairaTag account.",
      metadata: {
        bvnLast4: clean.slice(-4),
      },
    });

    await writeDataUnsafe(data);
    return { user, claim: claim ?? null };
  });
}

export async function linkBankAccountForUser({
  userId,
  bankCode,
  bankName,
  accountNumber,
  accountName,
  nipCode,
  provider = "manual",
  status,
  lookupMessage,
}: {
  userId: string;
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountName?: string;
  nipCode?: string;
  provider?: "mono" | "manual";
  status: BankAccountRecord["status"];
  lookupMessage?: string;
}) {
  const normalizedBankCode = bankCode.trim();
  const normalizedBankName = bankName.trim();
  const normalizedAccountNumber = accountNumber.replace(/\D/g, "");

  if (!normalizedBankCode) throw new Error("missing_bank_code");
  if (!normalizedBankName) throw new Error("missing_bank_name");
  if (!/^\d{10}$/.test(normalizedAccountNumber)) {
    throw new Error("invalid_account_number");
  }

  return enqueue(async () => {
    const data = await readDataUnsafe();
    const user = data.users.find((entry) => entry.id === userId);
    if (!user) throw new Error("user_not_found");
    if (!user.phoneVerifiedAt) throw new Error("phone_not_verified");

    const nowIso = new Date().toISOString();
    const existingIndex = data.bankAccounts.findIndex(
      (account) => account.userId === userId
    );
    const existingAccount =
      existingIndex >= 0 ? data.bankAccounts[existingIndex] : null;

    const bankAccount: BankAccountRecord = {
      id: existingAccount?.id ?? newId("bank"),
      userId,
      bankCode: normalizedBankCode,
      bankName: normalizedBankName,
      nipCode: nipCode?.trim() || undefined,
      accountName: accountName?.trim() || existingAccount?.accountName,
      accountNumberMasked: maskAccountNumber(normalizedAccountNumber),
      accountNumberLast4: normalizedAccountNumber.slice(-4),
      accountNumberEncrypted: encryptSensitiveValue(normalizedAccountNumber),
      provider,
      status,
      linkedAt: nowIso,
      verifiedAt: status === "verified" ? nowIso : existingAccount?.verifiedAt,
      lookupMessage: lookupMessage?.trim() || undefined,
    };

    if (existingIndex >= 0) {
      data.bankAccounts.splice(existingIndex, 1);
    }
    data.bankAccounts.unshift(bankAccount);

    user.bankLinkedAt = nowIso;

    const claim = data.claims.find((entry) => entry.userId === userId);
    if (claim) {
      claim.bank = normalizedBankName;
      if (bankAccount.accountName && !user.fullName) {
        claim.displayName = bankAccount.accountName;
      }
    }

    addNotificationUnsafe(data, {
      userId,
      handle: claim?.handle,
      type: "bank_linked",
      title: "Bank account linked",
      body: `${normalizedBankName} payout destination is now saved.`,
      metadata: {
        bankAccountId: bankAccount.id,
        bankName: normalizedBankName,
        accountNumberLast4: bankAccount.accountNumberLast4,
      },
    });

    await writeDataUnsafe(data);
    return { user, claim: claim ?? null, bankAccount };
  });
}

export async function listUsers({
  limit = 25,
  offset = 0,
  q,
}: {
  limit?: number;
  offset?: number;
  q?: string;
}) {
  return enqueue(async () => {
    const data = await readDataUnsafe();
    const query = q ? q.trim().toLowerCase() : "";
    const filtered = query
      ? data.users.filter(
          (u) =>
            u.phone.toLowerCase().includes(query) ||
            (u.fullName || "").toLowerCase().includes(query) ||
            (u.bvnLast4 || "").includes(query)
        )
      : data.users;

    return {
      total: filtered.length,
      items: filtered.slice(offset, offset + limit),
    };
  });
}
