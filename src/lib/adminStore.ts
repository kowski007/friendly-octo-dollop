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
  OtpRecord,
  UserRecord,
  Verification,
} from "./adminTypes";

export type AdminData = {
  claims: ClaimRecord[];
  apiLogs: ApiLogRecord[];
  users: UserRecord[];
  otps: OtpRecord[];
  bankAccounts: BankAccountRecord[];
};

const DATA_FILE = path.join(process.cwd(), "data", "nairatag-admin.json");
const MAX_API_LOGS = 5000;
let storageWarningShown = false;

function emptyData(): AdminData {
  return { claims: [], apiLogs: [], users: [], otps: [], bankAccounts: [] };
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
