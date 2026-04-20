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
  HandleReputation,
  MarketplaceEligibility,
  MarketplaceListingDetail,
  MarketplaceListingRecord,
  MarketplaceListingStatus,
  MarketplaceListingView,
  MarketplaceOfferRecord,
  MarketplaceStats,
  OtpRecord,
  TransactionRecord,
  UserRecord,
  Verification,
} from "./adminTypes";

export type AdminData = {
  claims: ClaimRecord[];
  apiLogs: ApiLogRecord[];
  users: UserRecord[];
  otps: OtpRecord[];
  bankAccounts: BankAccountRecord[];
  transactions: TransactionRecord[];
  marketplaceListings: MarketplaceListingRecord[];
  marketplaceOffers: MarketplaceOfferRecord[];
};

const DATA_FILE = path.join(process.cwd(), "data", "nairatag-admin.json");
const MAX_API_LOGS = 5000;
let storageWarningShown = false;

function emptyData(): AdminData {
  return {
    claims: [],
    apiLogs: [],
    users: [],
    otps: [],
    bankAccounts: [],
    transactions: [],
    marketplaceListings: [],
    marketplaceOffers: [],
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
  if (storageWarningShown) return;
  storageWarningShown = true;
  console.warn(
    "[nairatag] Falling back to file-backed admin store:",
    error instanceof Error ? error.message : String(error)
  );
}

async function readDataUnsafe(): Promise<AdminData> {
  if (isDatabaseBackedAdminStoreEnabled()) {
    try {
      const dbData = await readAdminStateFromDatabase();
      if (dbData) return normalizeData(dbData);

      const fileData = await readFileDataUnsafe();
      await writeAdminStateToDatabase(fileData);
      return fileData;
    } catch (error) {
      warnStorageFallback(error);
    }
  }

  return readFileDataUnsafe();
}

async function writeDataUnsafe(data: AdminData) {
  if (isDatabaseBackedAdminStoreEnabled()) {
    try {
      await writeAdminStateToDatabase(data);
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

function buildHandleReputation(
  data: AdminData,
  claim: ClaimRecord | null
): HandleReputation | null {
  if (!claim) return null;

  const transactions = data.transactions.filter(
    (transaction) => transaction.handle === claim.handle
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
    transferReviewRequired: true,
    reputationTransfersOnSale: false,
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
    const transaction: TransactionRecord = {
      id: newId("txn"),
      handle: normalizedHandle,
      userId: claim.userId,
      counterpartyHandle: normalizedCounterparty,
      amount: normalizedAmount,
      currency: "NGN",
      channel,
      status,
      reference: reference?.trim() || undefined,
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

    return {
      eligibility: buildMarketplaceEligibility(data, userId),
      claim,
      bankAccount,
      listing: listingDetail,
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
    if (action === "accept") {
      offer.status = "accepted";
      offer.updatedAt = nowIso;
      offer.respondedAt = nowIso;
      listing.status = "under_review";
      listing.reviewStartedAt = nowIso;
      listing.updatedAt = nowIso;

      for (const otherOffer of data.marketplaceOffers) {
        if (
          otherOffer.listingId === listing.id &&
          otherOffer.id !== offer.id &&
          otherOffer.status === "pending"
        ) {
          otherOffer.status = "rejected";
          otherOffer.updatedAt = nowIso;
          otherOffer.respondedAt = nowIso;
        }
      }
    } else {
      offer.status = "rejected";
      offer.updatedAt = nowIso;
      offer.respondedAt = nowIso;
    }

    await writeDataUnsafe(data);
    return {
      listing: buildMarketplaceListingDetail(data, listing),
      offer,
    };
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
