export type Verification = "verified" | "business" | "pending";
export type BankLinkStatus = "verified" | "pending_lookup";

export type ClaimRecord = {
  id: string;
  handle: string;
  displayName: string;
  bank: string;
  verification: Verification;
  claimedAt: string; // ISO
  source: "web" | "api";
  userId?: string;
  phone?: string;
  verifiedAt?: string; // ISO
};

export type ApiLogRecord = {
  id: string;
  ts: string; // ISO
  endpoint: string;
  method: string;
  status: number;
  latencyMs: number;
  handle?: string;
  clientKey?: string;
};

export type UserRecord = {
  id: string;
  phone: string; // E.164-ish
  createdAt: string; // ISO
  phoneVerifiedAt: string; // ISO
  fullName?: string;
  bvnLast4?: string;
  bvnLinkedAt?: string; // ISO
  bankLinkedAt?: string; // ISO
  geo?: {
    ip?: string;
    country?: string;
    region?: string;
    city?: string;
  };
};

export type BankAccountRecord = {
  id: string;
  userId: string;
  bankCode: string;
  bankName: string;
  nipCode?: string;
  accountName?: string;
  accountNumberMasked: string;
  accountNumberLast4: string;
  accountNumberEncrypted: string;
  provider: "mono" | "manual";
  status: BankLinkStatus;
  linkedAt: string; // ISO
  verifiedAt?: string; // ISO
  lookupMessage?: string;
};

export type OtpRecord = {
  id: string;
  phone: string; // E.164-ish
  codeHash: string;
  createdAt: string; // ISO
  expiresAt: string; // ISO
  consumedAt?: string; // ISO
  attempts: number;
  lastAttemptAt?: string; // ISO
  ip?: string;
  userAgent?: string;
  devCode?: string;
};

export type AdminMetrics = {
  totalClaims: number;
  claimsToday: number;
  verifiedClaims: number;
  pendingClaims: number;
  totalUsers: number;
  phoneVerifiedUsers: number;
  bvnLinkedUsers: number;
  bankLinkedUsers: number;
  totalApiCalls: number;
  apiCallsToday: number;
  successRate24h: number | null;
  avgLatency24h: number | null;
  callsLast7Days: Array<{ day: string; count: number }>;
  topEndpoints: Array<{ endpoint: string; count: number }>;
};
