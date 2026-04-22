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
export type MarketplaceTransferStatus =
  | "pending_review"
  | "approved"
  | "rejected";
export type CreditRiskBand = "low" | "medium" | "high";
export type NotificationType =
  | "otp_requested"
  | "payment_received"
  | "payment_failed"
  | "payment_disputed"
  | "marketplace_offer_submitted"
  | "marketplace_offer_accepted"
  | "marketplace_offer_rejected"
  | "marketplace_transfer_approved"
  | "marketplace_transfer_rejected"
  | "referral_signup"
  | "referral_points_awarded"
  | "referral_converted"
  | "bvn_linked"
  | "bank_linked"
  | "admin_review_required"
  | "suspicious_activity";
export type NotificationPriority = "low" | "normal" | "high";
export type NotificationStatus = "unread" | "read";
export type NotificationDeliveryChannel = "in_app" | "webhook";
export type NotificationDeliveryStatus =
  | "queued"
  | "delivered"
  | "failed"
  | "skipped";
export type ReferralSource = "link" | "unknown";

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

export type NotificationRecord = {
  id: string;
  userId?: string;
  handle?: string;
  type: NotificationType;
  title: string;
  body: string;
  priority: NotificationPriority;
  status: NotificationStatus;
  createdAt: string; // ISO
  readAt?: string; // ISO
  deliveryChannels?: NotificationDeliveryChannel[];
  deliveryStatus?: NotificationDeliveryStatus;
  deliveryAttempts?: number;
  lastDeliveryAttemptAt?: string; // ISO
  deliveredAt?: string; // ISO
  deliveryError?: string;
  metadata?: Record<string, string | number | boolean | null | undefined>;
};

export type UserRecord = {
  id: string;
  phone: string; // E.164-ish
  createdAt: string; // ISO
  phoneVerifiedAt: string; // ISO
  privyUserId?: string;
  privyLinkedAt?: string; // ISO
  email?: string;
  walletAddress?: string;
  fullName?: string;
  bvnLast4?: string;
  bvnLinkedAt?: string; // ISO
  bankLinkedAt?: string; // ISO
  referralCode?: string;
  referredByUserId?: string;
  referredAt?: string; // ISO
  geo?: {
    ip?: string;
    country?: string;
    region?: string;
    city?: string;
  };
};

export type ReferralRecord = {
  id: string;
  referrerUserId: string;
  referredUserId: string;
  referralCode: string;
  source: ReferralSource;
  createdAt: string; // ISO
  convertedAt?: string; // ISO
  signupPoints?: number;
  conversionPoints?: number;
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
    eventId?: string;
    externalStatus?: string;
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

export type MarketplaceTransferRecord = {
  id: string;
  listingId: string;
  offerId: string;
  handle: string;
  sellerUserId: string;
  buyerUserId?: string;
  buyerName: string;
  buyerPhone: string;
  amount: number;
  status: MarketplaceTransferStatus;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  reviewedAt?: string; // ISO
  transferredAt?: string; // ISO
  reviewNote?: string;
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
  transfer?: MarketplaceTransferRecord | null;
  creditProfile: CreditProfile | null;
  transferReviewRequired: true;
  reputationTransfersOnSale: false;
};

export type MarketplaceStats = {
  liveListings: number;
  underReviewListings: number;
  pendingTransfers: number;
  approvedTransfers: number;
  totalOffers: number;
  pendingOffers: number;
  averageAskAmount: number | null;
  averageOfferAmount: number | null;
};

export type MarketplaceTransferDetail = MarketplaceTransferRecord & {
  listing: MarketplaceListingRecord;
  offer: MarketplaceOfferRecord;
  claim: ClaimRecord | null;
  seller: UserRecord | null;
  buyer: UserRecord | null;
  buyerBankAccount: BankAccountRecord | null;
  currentReputation: HandleReputation | null;
};

export type CreditProfile = {
  handle: string;
  score: number;
  riskBand: CreditRiskBand;
  trustScore: number;
  activeMonths: number;
  accountAgeDays: number;
  settledTransactionCount: number;
  disputedTransactionCount: number;
  totalVolume: number;
  monthlyAverageVolume: number;
  recommendedLimit: number;
  repaymentConfidence: number;
  drivers: string[];
  lastEvaluatedAt: string;
};

export type PublicHandleProfile = {
  handle: string;
  displayName: string;
  bio?: string;
  location?: string;
  memberSince: string; // ISO
  lastActiveAt?: string; // ISO
  verification: {
    status: Verification;
    verified: boolean;
    verifiedAt?: string; // ISO
    badges: string[];
    bankAccountVerified: boolean;
    bvnVerified: boolean;
  };
  bank: {
    name: string;
    accountVerified: boolean;
  };
  reputation: {
    trustScore: number;
    stars: number;
    reviewCount: number;
    riskLevel: CreditRiskBand | "unknown";
    creditScoreRange?: string;
    badges: string[];
  };
  publicStats: {
    transactionCount: number;
    settledTransactionCount: number;
    totalVolume: number;
    recentTransactionCount30d: number;
    chargebackRate: number;
    averageTransactionSize: number;
  };
  shareUrl: string;
  payUrl: string;
  qrPayload: string;
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
