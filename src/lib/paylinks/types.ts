export type PaylinkLinkType =
  | "standard"
  | "invoice"
  | "subscription"
  | "donation"
  | "event";

export type PaylinkAmountType = "fixed" | "open" | "range" | "suggested";

export type PaylinkFeeBearer = "recipient" | "payer";

export type PaylinkStatus = "active" | "paused" | "expired" | "deleted";

export type PaylinkSource = "dashboard" | "api" | "sdk";

export type PaylinkPaymentStatus =
  | "initialized"
  | "pending"
  | "paid"
  | "failed"
  | "cancelled"
  | "refunded";

export type PaylinkSettlementStatus =
  | "queued"
  | "processing"
  | "successful"
  | "failed"
  | "skipped";

export type PaylinkRecord = {
  id: string;
  shortCode: string;
  handle: string;
  ownerId: string;

  linkType: PaylinkLinkType;
  title?: string;
  description?: string;
  logoUrl?: string;

  amountType: PaylinkAmountType;
  amountKobo?: number;
  amountMinKobo?: number;
  amountMaxKobo?: number;
  suggestedAmountsKobo?: number[];
  currency: "NGN";

  recipientName: string;
  recipientNuban: string;
  recipientBank: string;
  recipientBankCode: string;

  collectEmail: boolean;
  collectPhone: boolean;
  collectName: boolean;
  customFields: unknown[];

  redirectUrl?: string;
  cancelUrl?: string;

  maxUses?: number;
  useCount: number;
  expiresAt?: string;

  feeBearer: PaylinkFeeBearer;
  platformFeeBps: number;

  status: PaylinkStatus;
  metadata: Record<string, unknown>;
  source: PaylinkSource;
  apiKeyId?: string;

  createdAt: string;
  updatedAt: string;
};

export type PaylinkPaymentRecord = {
  id: string;
  paylinkId: string;
  paylinkShortCode: string;
  paylinkHandle: string;
  ownerId: string;
  processor: "flutterwave";
  txRef: string;
  receiptNumber: string;
  status: PaylinkPaymentStatus;
  amountKobo: number;
  currency: "NGN";
  feeBearer: PaylinkFeeBearer;
  platformFeeKobo: number;
  processorFeeKobo: number;
  netAmountKobo: number;
  payerName?: string;
  payerEmail: string;
  payerPhone?: string;
  note?: string;
  customFields: Record<string, unknown>;
  metadata: Record<string, unknown>;
  processorCheckoutUrl?: string;
  processorTransactionId?: string;
  processorReference?: string;
  processorStatus?: string;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type PaylinkSettlementRecord = {
  id: string;
  paylinkId: string;
  paymentId: string;
  processor: "flutterwave";
  transferReference: string;
  status: PaylinkSettlementStatus;
  amountKobo: number;
  currency: "NGN";
  recipientName: string;
  recipientNuban: string;
  recipientBank: string;
  recipientBankCode: string;
  processorTransferId?: string;
  processorBeneficiaryId?: string;
  failureReason?: string;
  processorResponse: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  initiatedAt?: string;
  completedAt?: string;
};

export type PaylinkReceiptView = {
  paylink: PaylinkRecord;
  payment: PaylinkPaymentRecord;
  settlement: PaylinkSettlementRecord | null;
};

export type PaylinkPublicView = {
  id: string;
  shortCode: string;
  handle: string;
  title?: string;
  description?: string;
  logoUrl?: string;
  recipient: {
    displayName: string;
    bank: string;
    verified: boolean;
  };
  amountType: PaylinkAmountType;
  amount?: number;
  amountMin?: number;
  amountMax?: number;
  suggestedAmounts?: number[];
  currency: "NGN";
  collectEmail: boolean;
  collectPhone: boolean;
  collectName: boolean;
  customFields: unknown[];
  feeBearer: PaylinkFeeBearer;
  status: PaylinkStatus;
  isExpired: boolean;
  isExhausted: boolean;
};

export type PaylinksDashboardData = {
  paylinks: PaylinkRecord[];
  payments: PaylinkPaymentRecord[];
  settlements: PaylinkSettlementRecord[];
  summary: {
    totalPaylinks: number;
    activePaylinks: number;
    totalPayments: number;
    successfulPayments: number;
    grossVolumeKobo: number;
    settledVolumeKobo: number;
    outstandingSettlementsKobo: number;
  };
};
