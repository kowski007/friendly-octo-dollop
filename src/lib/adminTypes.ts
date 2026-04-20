export type Verification = "verified" | "business" | "pending";
export type BankLinkStatus = "verified" | "pending_lookup";
export type TransactionStatus = "pending" | "settled" | "failed" | "disputed";
export type TransactionChannel =
  | "payment_link"
  | "manual_transfer"
  | "api"
  | "marketplace";
export type MarketplaceListingStatus =
  | "active"
  | "paused"
  | "under_review"
  | "withdrawn"
  | "sold";
export type MarketplaceSaleMode = "fixed_price" | "offers_only";
export type MarketplaceOfferStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "withdrawn";

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

export type TransactionRecord = {
  id: string;
  handle: string;
  userId?: string;
  counterpartyHandle?: string;
  amount: number;
  currency: "NGN";
  channel: TransactionChannel;
  status: TransactionStatus;
  reference?: string;
  note?: string;
  senderName?: string;
  senderPhone?: string;
  recordedAt: string; // ISO
  settledAt?: string; // ISO
  disputedAt?: string; // ISO
  metadata?: {
    sourcePage?: string;
    ip?: string;
    provider?: string;
  };
};

export type HandleReputation = {
  handle: string;
  trustScore: number;
  transactionCount: number;
  settledTransactionCount: number;
  totalVolume: number;
  recentTransactionCount30d: number;
  accountAgeDays: number;
  disputeRate: number;
  lastActivityAt?: string;
  isVerified: boolean;
  isBusiness: boolean;
  isBankLinked: boolean;
  badges: string[];
};

export type MarketplaceListingRecord = {
  id: string;
  handle: string;
  sellerUserId: string;
  saleMode: MarketplaceSaleMode;
  askAmount?: number;
  minOfferAmount?: number;
  status: MarketplaceListingStatus;
  sellerNote?: string;
  commissionBps: number;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  publishedAt: string; // ISO
  reviewStartedAt?: string; // ISO
  withdrawnAt?: string; // ISO
};

export type MarketplaceOfferRecord = {
  id: string;
  listingId: string;
  handle: string;
  buyerUserId?: string;
  buyerName: string;
  buyerPhone: string;
  amount: number;
  note?: string;
  status: MarketplaceOfferStatus;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  respondedAt?: string; // ISO
};

export type MarketplaceEligibilityReason =
  | "eligible"
  | "unauthorized"
  | "no_handle"
  | "bank_link_required"
  | "reserved_short_handle"
  | "ownership_cooldown"
  | "listing_already_exists";

export type MarketplaceEligibility = {
  eligible: boolean;
  reason: MarketplaceEligibilityReason;
  handle?: string;
  ownershipDays?: number;
  minimumOwnershipDays: number;
  requiresBankLink: boolean;
  requiresVerifiedIdentity: boolean;
};

export type MarketplaceListingView = {
  listing: MarketplaceListingRecord;
  claim: ClaimRecord;
  reputation: HandleReputation | null;
  offerCount: number;
  pendingOfferCount: number;
  highestOfferAmount: number | null;
  ownerSinceDays: number;
  ownerSinceAt: string;
  bankLinked: boolean;
};

export type MarketplaceListingDetail = MarketplaceListingView & {
  offers: MarketplaceOfferRecord[];
  recentTransactions: TransactionRecord[];
  transferReviewRequired: true;
  reputationTransfersOnSale: false;
};

export type MarketplaceStats = {
  liveListings: number;
  underReviewListings: number;
  totalOffers: number;
  pendingOffers: number;
  averageAskAmount: number | null;
  averageOfferAmount: number | null;
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
  totalTransactions: number;
  transactionsToday: number;
  totalTransactionVolume: number;
  activeHandles24h: number;
  successRate24h: number | null;
  avgLatency24h: number | null;
  callsLast7Days: Array<{ day: string; count: number }>;
  topEndpoints: Array<{ endpoint: string; count: number }>;
};
