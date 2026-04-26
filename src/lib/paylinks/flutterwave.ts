import { timingSafeEqual } from "crypto";

type CreateHostedPaymentInput = {
  txRef: string;
  amountNaira: number;
  redirectUrl: string;
  customer: {
    email: string;
    name?: string;
    phoneNumber?: string;
  };
  customizations: {
    title: string;
    description: string;
    logoUrl?: string;
  };
  meta?: Record<string, unknown>;
};

type FlutterwaveVerifyPayload = {
  id?: number | string;
  tx_ref?: string;
  flw_ref?: string;
  amount?: number | string;
  charged_amount?: number | string;
  app_fee?: number | string;
  merchant_fee?: number | string;
  currency?: string;
  status?: string;
  customer?: {
    email?: string;
    name?: string;
    phone_number?: string;
  };
};

type FlutterwaveTransferPayload = {
  id?: number | string;
  reference?: string;
  status?: string;
  beneficiary?: number | string;
};

type FlutterwaveRefundPayload = {
  id?: number | string;
  tx_ref?: string;
  flw_ref?: string;
  status?: string;
  amount_refunded?: number | string;
  amount?: number | string;
};

function flwSecretKey() {
  return process.env.FLW_SECRET_KEY?.trim() || "";
}

function flwWebhookSecretHash() {
  return process.env.FLW_SECRET_HASH?.trim() || "";
}

function flwBaseUrl() {
  return (process.env.FLW_BASE_URL || "https://api.flutterwave.com/v3").replace(
    /\/+$/,
    ""
  );
}

function flwHeaders() {
  return {
    Authorization: `Bearer ${flwSecretKey()}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

function requireFlutterwaveSecret() {
  const secret = flwSecretKey();
  if (!secret) throw new Error("flutterwave_not_configured");
  return secret;
}

function toMajorAmount(kobo: number) {
  return Number((kobo / 100).toFixed(2));
}

function toKobo(value: unknown) {
  const number =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : NaN;
  if (!Number.isFinite(number)) return 0;
  return Math.round(number * 100);
}

async function parseResponse<T>(response: Response) {
  const payload = (await response.json().catch(() => null)) as T | null;
  if (!response.ok) {
    const detail =
      payload && typeof payload === "object" && payload && "message" in payload
        ? String((payload as { message?: unknown }).message || "flutterwave_http_error")
        : `flutterwave_http_${response.status}`;
    throw new Error(detail);
  }
  return payload;
}

export function hasFlutterwaveConfig() {
  return Boolean(flwSecretKey());
}

export async function createHostedPayment(input: CreateHostedPaymentInput) {
  requireFlutterwaveSecret();
  const response = await fetch(`${flwBaseUrl()}/payments`, {
    method: "POST",
    headers: flwHeaders(),
    body: JSON.stringify({
      tx_ref: input.txRef,
      amount: toMajorAmount(input.amountNaira * 100),
      currency: "NGN",
      redirect_url: input.redirectUrl,
      payment_options: "card,account,banktransfer,ussd",
      customer: {
        email: input.customer.email,
        name: input.customer.name,
        phonenumber: input.customer.phoneNumber,
      },
      customizations: {
        title: input.customizations.title,
        description: input.customizations.description,
        logo_url: input.customizations.logoUrl,
      },
      meta: input.meta ?? {},
    }),
    cache: "no-store",
  });

  const payload = await parseResponse<{
    status?: string;
    message?: string;
    data?: { link?: string };
  }>(response);

  const checkoutUrl = payload?.data?.link?.trim();
  if (!checkoutUrl) throw new Error("flutterwave_checkout_url_missing");
  return {
    checkoutUrl,
    payload,
  };
}

export async function verifyTransaction(transactionId: string | number) {
  requireFlutterwaveSecret();
  const response = await fetch(
    `${flwBaseUrl()}/transactions/${encodeURIComponent(String(transactionId))}/verify`,
    {
      method: "GET",
      headers: flwHeaders(),
      cache: "no-store",
    }
  );

  const payload = await parseResponse<{
    status?: string;
    message?: string;
    data?: FlutterwaveVerifyPayload;
  }>(response);

  const data = payload?.data;
  if (!data) throw new Error("flutterwave_verify_missing_data");

  return {
    raw: payload,
    id: data.id ? String(data.id) : undefined,
    txRef: data.tx_ref?.trim() || "",
    flwRef: data.flw_ref?.trim() || undefined,
    amountKobo: toKobo(data.amount ?? data.charged_amount),
    chargedAmountKobo: toKobo(data.charged_amount ?? data.amount),
    processorFeeKobo: toKobo(data.app_fee ?? data.merchant_fee),
    currency: (data.currency?.trim().toUpperCase() || "NGN") as "NGN" | string,
    status: data.status?.trim().toLowerCase() || "unknown",
    customer: {
      email: data.customer?.email?.trim().toLowerCase() || "",
      name: data.customer?.name?.trim() || undefined,
      phoneNumber: data.customer?.phone_number?.trim() || undefined,
    },
  };
}

export async function createTransfer(input: {
  amountKobo: number;
  reference: string;
  accountNumber: string;
  bankCode: string;
  accountName: string;
  narration: string;
  callbackUrl?: string;
}) {
  requireFlutterwaveSecret();
  const response = await fetch(`${flwBaseUrl()}/transfers`, {
    method: "POST",
    headers: flwHeaders(),
    body: JSON.stringify({
      account_bank: input.bankCode,
      account_number: input.accountNumber,
      amount: toMajorAmount(input.amountKobo),
      currency: "NGN",
      debit_currency: "NGN",
      reference: input.reference,
      narration: input.narration,
      beneficiary_name: input.accountName,
      callback_url: input.callbackUrl,
    }),
    cache: "no-store",
  });

  const payload = await parseResponse<{
    status?: string;
    message?: string;
    data?: {
      id?: number | string;
      reference?: string;
      status?: string;
      beneficiary?: number | string;
    };
  }>(response);

  return {
    raw: payload,
    transferId: payload?.data?.id ? String(payload.data.id) : undefined,
    reference: payload?.data?.reference?.trim() || input.reference,
    status: payload?.data?.status?.trim().toLowerCase() || "processing",
    beneficiaryId: payload?.data?.beneficiary
      ? String(payload.data.beneficiary)
      : undefined,
  };
}

export async function getTransfer(transferId: string) {
  requireFlutterwaveSecret();
  const response = await fetch(
    `${flwBaseUrl()}/transfers/${encodeURIComponent(transferId)}`,
    {
      method: "GET",
      headers: flwHeaders(),
      cache: "no-store",
    }
  );

  const payload = await parseResponse<{
    status?: string;
    message?: string;
    data?: FlutterwaveTransferPayload;
  }>(response);

  return {
    raw: payload ?? {},
    transferId: payload?.data?.id ? String(payload.data.id) : transferId,
    reference: payload?.data?.reference?.trim() || undefined,
    status: payload?.data?.status?.trim().toLowerCase() || "unknown",
    beneficiaryId: payload?.data?.beneficiary
      ? String(payload.data.beneficiary)
      : undefined,
  };
}

export async function createRefund(input: {
  transactionId: string;
  amountKobo?: number;
  comments?: string;
}) {
  requireFlutterwaveSecret();
  const response = await fetch(
    `${flwBaseUrl()}/transactions/${encodeURIComponent(input.transactionId)}/refund`,
    {
      method: "POST",
      headers: flwHeaders(),
      body: JSON.stringify({
        amount: input.amountKobo ? toMajorAmount(input.amountKobo) : undefined,
        comments: input.comments,
      }),
      cache: "no-store",
    }
  );

  const payload = await parseResponse<{
    status?: string;
    message?: string;
    data?: FlutterwaveRefundPayload;
  }>(response);

  return {
    raw: payload ?? {},
    refundId: payload?.data?.id ? String(payload.data.id) : undefined,
    reference:
      payload?.data?.tx_ref?.trim() ||
      payload?.data?.flw_ref?.trim() ||
      undefined,
    status: payload?.data?.status?.trim().toLowerCase() || "processing",
    amountRefundedKobo: toKobo(
      payload?.data?.amount_refunded ?? payload?.data?.amount
    ),
  };
}

export function verifyWebhookHash(signature: string | null) {
  const expected = flwWebhookSecretHash();
  if (!expected) return false;
  const received = signature?.trim() || "";
  if (!received) return false;
  const left = Buffer.from(received);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}
