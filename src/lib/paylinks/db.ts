import crypto from "crypto";
import { Pool } from "pg";

import type {
  PaylinkPaymentRecord,
  PaylinkPublicView,
  PaylinkReceiptView,
  PaylinkRecord,
  PaylinkSettlementRecord,
  PaylinksDashboardData,
} from "./types";

const PAYLINKS_TABLE = "nt_paylinks";
const PAYLINK_PAYMENTS_TABLE = "nt_paylink_payments";
const PAYLINK_SETTLEMENTS_TABLE = "nt_paylink_settlements";
const PAYLINK_EVENTS_TABLE = "nt_paylink_events";

declare global {
  var __nairatagPaylinksPool: Pool | undefined;
}

function databaseUrl() {
  return process.env.DATABASE_URL?.trim() || "";
}

function canUseDatabase() {
  return Boolean(databaseUrl());
}

function getPool() {
  if (!canUseDatabase()) return null;
  if (!global.__nairatagPaylinksPool) {
    global.__nairatagPaylinksPool = new Pool({
      connectionString: databaseUrl(),
      ssl: { rejectUnauthorized: false },
      max: 4,
      connectionTimeoutMillis: 2500,
      idleTimeoutMillis: 10000,
      query_timeout: 7000,
      statement_timeout: 7000,
    });
  }
  return global.__nairatagPaylinksPool;
}

function newId(prefix: string) {
  return `${prefix}_${crypto.randomBytes(10).toString("hex")}`;
}

function parseMaybeInt(value: unknown) {
  if (value == null) return undefined;
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
  if (typeof value === "string" && value.trim()) {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function parseObject(value: unknown) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {}
  }
  return {};
}

function parseArray(value: unknown) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (Array.isArray(parsed)) return parsed;
    } catch {}
  }
  return [];
}

function iso(value: unknown) {
  return value ? new Date(String(value)).toISOString() : undefined;
}

function rowToPaylink(row: Record<string, unknown>): PaylinkRecord {
  return {
    id: String(row.id),
    shortCode: String(row.short_code),
    handle: String(row.handle),
    ownerId: String(row.owner_id),
    linkType: String(row.link_type) as PaylinkRecord["linkType"],
    title: row.title ? String(row.title) : undefined,
    description: row.description ? String(row.description) : undefined,
    logoUrl: row.logo_url ? String(row.logo_url) : undefined,
    amountType: String(row.amount_type) as PaylinkRecord["amountType"],
    amountKobo: parseMaybeInt(row.amount_kobo),
    amountMinKobo: parseMaybeInt(row.amount_min_kobo),
    amountMaxKobo: parseMaybeInt(row.amount_max_kobo),
    suggestedAmountsKobo: parseArray(row.suggested_amounts_kobo)
      .map(parseMaybeInt)
      .filter((value): value is number => typeof value === "number"),
    currency: "NGN",
    recipientName: String(row.recipient_name),
    recipientNuban: String(row.recipient_nuban),
    recipientBank: String(row.recipient_bank),
    recipientBankCode: String(row.recipient_bank_code),
    collectEmail: Boolean(row.collect_email),
    collectPhone: Boolean(row.collect_phone),
    collectName: Boolean(row.collect_name),
    customFields: parseArray(row.custom_fields),
    redirectUrl: row.redirect_url ? String(row.redirect_url) : undefined,
    cancelUrl: row.cancel_url ? String(row.cancel_url) : undefined,
    maxUses: parseMaybeInt(row.max_uses),
    useCount: parseMaybeInt(row.use_count) ?? 0,
    expiresAt: iso(row.expires_at),
    feeBearer: String(row.fee_bearer) as PaylinkRecord["feeBearer"],
    platformFeeBps: parseMaybeInt(row.platform_fee_bps) ?? 0,
    status: String(row.status) as PaylinkRecord["status"],
    metadata: parseObject(row.metadata),
    source: String(row.source) as PaylinkRecord["source"],
    apiKeyId: row.api_key_id ? String(row.api_key_id) : undefined,
    createdAt: iso(row.created_at) ?? new Date().toISOString(),
    updatedAt: iso(row.updated_at) ?? new Date().toISOString(),
  };
}

function rowToPayment(row: Record<string, unknown>): PaylinkPaymentRecord {
  return {
    id: String(row.id),
    paylinkId: String(row.paylink_id),
    paylinkShortCode: String(row.paylink_short_code),
    paylinkHandle: String(row.paylink_handle),
    ownerId: String(row.owner_id),
    processor: "flutterwave",
    txRef: String(row.tx_ref),
    receiptNumber: String(row.receipt_number),
    status: String(row.status) as PaylinkPaymentRecord["status"],
    amountKobo: parseMaybeInt(row.amount_kobo) ?? 0,
    currency: "NGN",
    feeBearer: String(row.fee_bearer) as PaylinkPaymentRecord["feeBearer"],
    platformFeeKobo: parseMaybeInt(row.platform_fee_kobo) ?? 0,
    processorFeeKobo: parseMaybeInt(row.processor_fee_kobo) ?? 0,
    netAmountKobo: parseMaybeInt(row.net_amount_kobo) ?? 0,
    payerName: row.payer_name ? String(row.payer_name) : undefined,
    payerEmail: String(row.payer_email),
    payerPhone: row.payer_phone ? String(row.payer_phone) : undefined,
    note: row.note ? String(row.note) : undefined,
    customFields: parseObject(row.custom_fields),
    metadata: parseObject(row.metadata),
    processorCheckoutUrl: row.processor_checkout_url
      ? String(row.processor_checkout_url)
      : undefined,
    processorTransactionId: row.processor_transaction_id
      ? String(row.processor_transaction_id)
      : undefined,
    processorReference: row.processor_reference
      ? String(row.processor_reference)
      : undefined,
    processorStatus: row.processor_status ? String(row.processor_status) : undefined,
    paidAt: iso(row.paid_at),
    createdAt: iso(row.created_at) ?? new Date().toISOString(),
    updatedAt: iso(row.updated_at) ?? new Date().toISOString(),
  };
}

function rowToSettlement(row: Record<string, unknown>): PaylinkSettlementRecord {
  return {
    id: String(row.id),
    paylinkId: String(row.paylink_id),
    paymentId: String(row.payment_id),
    processor: "flutterwave",
    transferReference: String(row.transfer_reference),
    status: String(row.status) as PaylinkSettlementRecord["status"],
    amountKobo: parseMaybeInt(row.amount_kobo) ?? 0,
    currency: "NGN",
    recipientName: String(row.recipient_name),
    recipientNuban: String(row.recipient_nuban),
    recipientBank: String(row.recipient_bank),
    recipientBankCode: String(row.recipient_bank_code),
    processorTransferId: row.processor_transfer_id
      ? String(row.processor_transfer_id)
      : undefined,
    processorBeneficiaryId: row.processor_beneficiary_id
      ? String(row.processor_beneficiary_id)
      : undefined,
    failureReason: row.failure_reason ? String(row.failure_reason) : undefined,
    processorResponse: parseObject(row.processor_response),
    createdAt: iso(row.created_at) ?? new Date().toISOString(),
    updatedAt: iso(row.updated_at) ?? new Date().toISOString(),
    initiatedAt: iso(row.initiated_at),
    completedAt: iso(row.completed_at),
  };
}

function toPublicPaylink(record: PaylinkRecord): PaylinkPublicView {
  const expiresAt = record.expiresAt ? new Date(record.expiresAt).getTime() : null;
  const isExpired = Boolean(expiresAt && expiresAt <= Date.now());
  const isExhausted = Boolean(record.maxUses && record.useCount >= record.maxUses);

  return {
    id: record.id,
    shortCode: record.shortCode,
    handle: record.handle,
    title: record.title,
    description: record.description,
    logoUrl: record.logoUrl,
    recipient: {
      displayName: record.recipientName,
      bank: record.recipientBank,
      verified: true,
    },
    amountType: record.amountType,
    amount: record.amountKobo ? Math.round(record.amountKobo / 100) : undefined,
    amountMin: record.amountMinKobo ? Math.round(record.amountMinKobo / 100) : undefined,
    amountMax: record.amountMaxKobo ? Math.round(record.amountMaxKobo / 100) : undefined,
    suggestedAmounts: (record.suggestedAmountsKobo ?? []).map((value) =>
      Math.round(value / 100)
    ),
    currency: "NGN",
    collectEmail: record.collectEmail,
    collectPhone: record.collectPhone,
    collectName: record.collectName,
    customFields: record.customFields,
    feeBearer: record.feeBearer,
    status: record.status,
    isExpired,
    isExhausted,
  };
}

async function ensureSchema(pool: Pool) {
  await pool.query(`
    create table if not exists ${PAYLINKS_TABLE} (
      id text primary key,
      short_code text not null unique,
      handle text not null,
      owner_id text not null,
      link_type text not null default 'standard',
      title text,
      description text,
      logo_url text,
      amount_type text not null default 'open',
      amount_kobo bigint,
      amount_min_kobo bigint,
      amount_max_kobo bigint,
      suggested_amounts_kobo jsonb not null default '[]'::jsonb,
      currency text not null default 'NGN',
      recipient_name text not null,
      recipient_nuban text not null,
      recipient_bank text not null,
      recipient_bank_code text not null,
      collect_email boolean not null default true,
      collect_phone boolean not null default false,
      collect_name boolean not null default true,
      custom_fields jsonb not null default '[]'::jsonb,
      redirect_url text,
      cancel_url text,
      max_uses integer,
      use_count integer not null default 0,
      expires_at timestamptz,
      fee_bearer text not null default 'recipient',
      platform_fee_bps integer not null default 50,
      status text not null default 'active',
      metadata jsonb not null default '{}'::jsonb,
      source text not null default 'dashboard',
      api_key_id text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `);

  await pool.query(`
    create table if not exists ${PAYLINK_PAYMENTS_TABLE} (
      id text primary key,
      paylink_id text not null,
      paylink_short_code text not null,
      paylink_handle text not null,
      owner_id text not null,
      processor text not null default 'flutterwave',
      tx_ref text not null unique,
      receipt_number text not null unique,
      status text not null default 'initialized',
      amount_kobo bigint not null,
      currency text not null default 'NGN',
      fee_bearer text not null default 'recipient',
      platform_fee_kobo bigint not null default 0,
      processor_fee_kobo bigint not null default 0,
      net_amount_kobo bigint not null default 0,
      payer_name text,
      payer_email text not null,
      payer_phone text,
      note text,
      custom_fields jsonb not null default '{}'::jsonb,
      metadata jsonb not null default '{}'::jsonb,
      processor_checkout_url text,
      processor_transaction_id text,
      processor_reference text,
      processor_status text,
      paid_at timestamptz,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `);

  await pool.query(`
    create table if not exists ${PAYLINK_SETTLEMENTS_TABLE} (
      id text primary key,
      paylink_id text not null,
      payment_id text not null unique,
      processor text not null default 'flutterwave',
      transfer_reference text not null unique,
      status text not null default 'queued',
      amount_kobo bigint not null,
      currency text not null default 'NGN',
      recipient_name text not null,
      recipient_nuban text not null,
      recipient_bank text not null,
      recipient_bank_code text not null,
      processor_transfer_id text,
      processor_beneficiary_id text,
      failure_reason text,
      processor_response jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      initiated_at timestamptz,
      completed_at timestamptz
    )
  `);

  await pool.query(`
    create table if not exists ${PAYLINK_EVENTS_TABLE} (
      id text primary key,
      provider text not null,
      event_key text not null unique,
      event_type text not null,
      payload jsonb not null default '{}'::jsonb,
      processed_at timestamptz not null default now()
    )
  `);

  await pool.query(
    `create index if not exists ${PAYLINKS_TABLE}_owner_idx on ${PAYLINKS_TABLE}(owner_id, created_at desc)`
  );
  await pool.query(
    `create index if not exists ${PAYLINKS_TABLE}_handle_idx on ${PAYLINKS_TABLE}(handle)`
  );
  await pool.query(
    `create index if not exists ${PAYLINK_PAYMENTS_TABLE}_owner_idx on ${PAYLINK_PAYMENTS_TABLE}(owner_id, created_at desc)`
  );
  await pool.query(
    `create index if not exists ${PAYLINK_PAYMENTS_TABLE}_paylink_idx on ${PAYLINK_PAYMENTS_TABLE}(paylink_id, created_at desc)`
  );
  await pool.query(
    `create index if not exists ${PAYLINK_PAYMENTS_TABLE}_status_idx on ${PAYLINK_PAYMENTS_TABLE}(status)`
  );
  await pool.query(
    `create index if not exists ${PAYLINK_SETTLEMENTS_TABLE}_paylink_idx on ${PAYLINK_SETTLEMENTS_TABLE}(paylink_id, created_at desc)`
  );
}

function requirePool() {
  const pool = getPool();
  if (!pool) throw new Error("database_not_configured");
  return pool;
}

export async function createPaylinkRecord(input: {
  shortCode: string;
  handle: string;
  ownerId: string;
  linkType: PaylinkRecord["linkType"];
  title?: string;
  description?: string;
  logoUrl?: string;
  amountType: PaylinkRecord["amountType"];
  amountKobo?: number;
  amountMinKobo?: number;
  amountMaxKobo?: number;
  suggestedAmountsKobo?: number[];
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
  expiresAt?: string;
  feeBearer: PaylinkRecord["feeBearer"];
  platformFeeBps: number;
  metadata: Record<string, unknown>;
  source: PaylinkRecord["source"];
  apiKeyId?: string;
}) {
  const pool = requirePool();
  await ensureSchema(pool);

  const now = new Date().toISOString();
  const res = await pool.query<Record<string, unknown>>(
    `
      insert into ${PAYLINKS_TABLE} (
        id, short_code, handle, owner_id,
        link_type, title, description, logo_url,
        amount_type, amount_kobo, amount_min_kobo, amount_max_kobo, suggested_amounts_kobo, currency,
        recipient_name, recipient_nuban, recipient_bank, recipient_bank_code,
        collect_email, collect_phone, collect_name, custom_fields,
        redirect_url, cancel_url, max_uses, use_count, expires_at,
        fee_bearer, platform_fee_bps, status, metadata, source, api_key_id,
        created_at, updated_at
      ) values (
        $1,$2,$3,$4,
        $5,$6,$7,$8,
        $9,$10,$11,$12,$13,'NGN',
        $14,$15,$16,$17,
        $18,$19,$20,$21,
        $22,$23,$24,0,$25,
        $26,$27,'active',$28,$29,$30,
        $31,$32
      )
      returning *
    `,
    [
      newId("pl"),
      input.shortCode,
      input.handle,
      input.ownerId,
      input.linkType,
      input.title ?? null,
      input.description ?? null,
      input.logoUrl ?? null,
      input.amountType,
      input.amountKobo ?? null,
      input.amountMinKobo ?? null,
      input.amountMaxKobo ?? null,
      JSON.stringify(input.suggestedAmountsKobo ?? []),
      input.recipientName,
      input.recipientNuban,
      input.recipientBank,
      input.recipientBankCode,
      input.collectEmail,
      input.collectPhone,
      input.collectName,
      JSON.stringify(input.customFields ?? []),
      input.redirectUrl ?? null,
      input.cancelUrl ?? null,
      input.maxUses ?? null,
      input.expiresAt ?? null,
      input.feeBearer,
      input.platformFeeBps,
      JSON.stringify(input.metadata ?? {}),
      input.source,
      input.apiKeyId ?? null,
      now,
      now,
    ]
  );

  return rowToPaylink(res.rows[0]);
}

export async function listPaylinksForOwner({
  ownerId,
  limit = 50,
  offset = 0,
}: {
  ownerId: string;
  limit?: number;
  offset?: number;
}) {
  const pool = requirePool();
  await ensureSchema(pool);

  const res = await pool.query<Record<string, unknown>>(
    `
      select * from ${PAYLINKS_TABLE}
      where owner_id = $1 and status != 'deleted'
      order by created_at desc
      limit $2 offset $3
    `,
    [ownerId, Math.min(Math.max(limit, 1), 100), Math.max(offset, 0)]
  );
  return res.rows.map(rowToPaylink);
}

export async function getPaylinkByShortCode(shortCode: string) {
  const pool = requirePool();
  await ensureSchema(pool);

  const res = await pool.query<Record<string, unknown>>(
    `select * from ${PAYLINKS_TABLE} where short_code = $1 limit 1`,
    [shortCode]
  );
  return res.rows[0] ? rowToPaylink(res.rows[0]) : null;
}

export async function getPaylinkByIdForOwner(paylinkId: string, ownerId: string) {
  const pool = requirePool();
  await ensureSchema(pool);

  const res = await pool.query<Record<string, unknown>>(
    `select * from ${PAYLINKS_TABLE} where id = $1 and owner_id = $2 limit 1`,
    [paylinkId, ownerId]
  );
  return res.rows[0] ? rowToPaylink(res.rows[0]) : null;
}

export async function updatePaylinkStatus({
  paylinkId,
  ownerId,
  status,
}: {
  paylinkId: string;
  ownerId: string;
  status: PaylinkRecord["status"];
}) {
  const pool = requirePool();
  await ensureSchema(pool);

  const res = await pool.query<Record<string, unknown>>(
    `
      update ${PAYLINKS_TABLE}
      set status = $3, updated_at = $4
      where id = $1 and owner_id = $2
      returning *
    `,
    [paylinkId, ownerId, status, new Date().toISOString()]
  );
  return res.rows[0] ? rowToPaylink(res.rows[0]) : null;
}

export async function getPublicPaylinkByShortCode(shortCode: string) {
  const paylink = await getPaylinkByShortCode(shortCode);
  if (!paylink || paylink.status === "deleted") return null;
  return {
    paylink,
    publicView: toPublicPaylink(paylink),
  };
}

export async function createPaylinkPaymentRecord(input: {
  paylink: PaylinkRecord;
  amountKobo: number;
  payerName?: string;
  payerEmail: string;
  payerPhone?: string;
  note?: string;
  customFields?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}) {
  const pool = requirePool();
  await ensureSchema(pool);

  const txRef = `ntpl_${input.paylink.handle}_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
  const receiptNumber = `NT-RCPT-${Date.now().toString(36).toUpperCase()}${crypto
    .randomBytes(2)
    .toString("hex")
    .toUpperCase()}`;
  const now = new Date().toISOString();
  const platformFeeKobo = Math.max(
    0,
    Math.floor((input.amountKobo * input.paylink.platformFeeBps) / 10000)
  );

  const res = await pool.query<Record<string, unknown>>(
    `
      insert into ${PAYLINK_PAYMENTS_TABLE} (
        id, paylink_id, paylink_short_code, paylink_handle, owner_id,
        processor, tx_ref, receipt_number, status, amount_kobo, currency,
        fee_bearer, platform_fee_kobo, processor_fee_kobo, net_amount_kobo,
        payer_name, payer_email, payer_phone, note, custom_fields, metadata,
        created_at, updated_at
      ) values (
        $1,$2,$3,$4,$5,
        'flutterwave',$6,$7,'initialized',$8,'NGN',
        $9,$10,0,$11,
        $12,$13,$14,$15,$16,$17,
        $18,$19
      )
      returning *
    `,
    [
      newId("plpay"),
      input.paylink.id,
      input.paylink.shortCode,
      input.paylink.handle,
      input.paylink.ownerId,
      txRef,
      receiptNumber,
      input.amountKobo,
      input.paylink.feeBearer,
      platformFeeKobo,
      Math.max(0, input.amountKobo - platformFeeKobo),
      input.payerName?.trim() || null,
      input.payerEmail.trim().toLowerCase(),
      input.payerPhone?.trim() || null,
      input.note?.trim() || null,
      JSON.stringify(input.customFields ?? {}),
      JSON.stringify(input.metadata ?? {}),
      now,
      now,
    ]
  );

  return rowToPayment(res.rows[0]);
}

export async function attachCheckoutUrlToPayment({
  paymentId,
  checkoutUrl,
}: {
  paymentId: string;
  checkoutUrl: string;
}) {
  const pool = requirePool();
  await ensureSchema(pool);

  const res = await pool.query<Record<string, unknown>>(
    `
      update ${PAYLINK_PAYMENTS_TABLE}
      set processor_checkout_url = $2,
          status = case when status = 'initialized' then 'pending' else status end,
          updated_at = $3
      where id = $1
      returning *
    `,
    [paymentId, checkoutUrl, new Date().toISOString()]
  );
  return res.rows[0] ? rowToPayment(res.rows[0]) : null;
}

export async function getPaylinkPaymentById(paymentId: string) {
  const pool = requirePool();
  await ensureSchema(pool);

  const res = await pool.query<Record<string, unknown>>(
    `select * from ${PAYLINK_PAYMENTS_TABLE} where id = $1 limit 1`,
    [paymentId]
  );
  return res.rows[0] ? rowToPayment(res.rows[0]) : null;
}

export async function getPaylinkPaymentByTxRef(txRef: string) {
  const pool = requirePool();
  await ensureSchema(pool);

  const res = await pool.query<Record<string, unknown>>(
    `select * from ${PAYLINK_PAYMENTS_TABLE} where tx_ref = $1 limit 1`,
    [txRef]
  );
  return res.rows[0] ? rowToPayment(res.rows[0]) : null;
}

export async function getPaylinkPaymentByProcessorTransactionId(transactionId: string) {
  const pool = requirePool();
  await ensureSchema(pool);

  const res = await pool.query<Record<string, unknown>>(
    `select * from ${PAYLINK_PAYMENTS_TABLE} where processor_transaction_id = $1 limit 1`,
    [transactionId]
  );
  return res.rows[0] ? rowToPayment(res.rows[0]) : null;
}

export async function markPaylinkPaymentFailed({
  paymentId,
  processorStatus,
  processorTransactionId,
  processorReference,
  metadata,
}: {
  paymentId: string;
  processorStatus?: string;
  processorTransactionId?: string;
  processorReference?: string;
  metadata?: Record<string, unknown>;
}) {
  const pool = requirePool();
  await ensureSchema(pool);

  const res = await pool.query<Record<string, unknown>>(
    `
      update ${PAYLINK_PAYMENTS_TABLE}
      set status = case when status = 'paid' then status else 'failed' end,
          processor_status = $2,
          processor_transaction_id = coalesce($3, processor_transaction_id),
          processor_reference = coalesce($4, processor_reference),
          metadata = metadata || $5::jsonb,
          updated_at = $6
      where id = $1
      returning *
    `,
    [
      paymentId,
      processorStatus ?? null,
      processorTransactionId ?? null,
      processorReference ?? null,
      JSON.stringify(metadata ?? {}),
      new Date().toISOString(),
    ]
  );
  return res.rows[0] ? rowToPayment(res.rows[0]) : null;
}

export async function markPaylinkPaymentPaid({
  paymentId,
  processorTransactionId,
  processorReference,
  processorStatus,
  processorFeeKobo,
  metadata,
}: {
  paymentId: string;
  processorTransactionId?: string;
  processorReference?: string;
  processorStatus?: string;
  processorFeeKobo?: number;
  metadata?: Record<string, unknown>;
}) {
  const pool = requirePool();
  await ensureSchema(pool);
  const client = await pool.connect();

  try {
    await client.query("begin");
    const existingRes = await client.query<Record<string, unknown>>(
      `select * from ${PAYLINK_PAYMENTS_TABLE} where id = $1 for update`,
      [paymentId]
    );
    if (!existingRes.rows[0]) {
      throw new Error("payment_not_found");
    }

    const current = rowToPayment(existingRes.rows[0]);
    const nextProcessorFeeKobo = Math.max(0, processorFeeKobo ?? current.processorFeeKobo);
    const nextNetAmount = Math.max(
      0,
      current.amountKobo - current.platformFeeKobo - nextProcessorFeeKobo
    );
    const now = new Date().toISOString();

    const updatedRes = await client.query<Record<string, unknown>>(
      `
        update ${PAYLINK_PAYMENTS_TABLE}
        set status = 'paid',
            processor_transaction_id = coalesce($2, processor_transaction_id),
            processor_reference = coalesce($3, processor_reference),
            processor_status = coalesce($4, processor_status),
            processor_fee_kobo = $5,
            net_amount_kobo = $6,
            metadata = metadata || $7::jsonb,
            paid_at = coalesce(paid_at, $8),
            updated_at = $8
        where id = $1
        returning *
      `,
      [
        paymentId,
        processorTransactionId ?? null,
        processorReference ?? null,
        processorStatus ?? null,
        nextProcessorFeeKobo,
        nextNetAmount,
        JSON.stringify(metadata ?? {}),
        now,
      ]
    );
    const updated = rowToPayment(updatedRes.rows[0]);

    if (current.status !== "paid") {
      await client.query(
        `
          update ${PAYLINKS_TABLE}
          set use_count = use_count + 1, updated_at = $2
          where id = $1
        `,
        [updated.paylinkId, now]
      );
    }

    await client.query("commit");
    return {
      payment: updated,
      newlyPaid: current.status !== "paid",
    };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function recordPaylinkWebhookEventOnce({
  provider,
  eventKey,
  eventType,
  payload,
}: {
  provider: string;
  eventKey: string;
  eventType: string;
  payload: Record<string, unknown>;
}) {
  const pool = requirePool();
  await ensureSchema(pool);

  const res = await pool.query(
    `
      insert into ${PAYLINK_EVENTS_TABLE} (
        id, provider, event_key, event_type, payload, processed_at
      ) values (
        $1,$2,$3,$4,$5,$6
      )
      on conflict (event_key) do nothing
      returning id
    `,
    [
      newId("plevt"),
      provider,
      eventKey,
      eventType,
      JSON.stringify(payload),
      new Date().toISOString(),
    ]
  );
  return Boolean(res.rows[0]);
}

export async function getSettlementByPaymentId(paymentId: string) {
  const pool = requirePool();
  await ensureSchema(pool);

  const res = await pool.query<Record<string, unknown>>(
    `select * from ${PAYLINK_SETTLEMENTS_TABLE} where payment_id = $1 limit 1`,
    [paymentId]
  );
  return res.rows[0] ? rowToSettlement(res.rows[0]) : null;
}

export async function getSettlementByTransferReference(reference: string) {
  const pool = requirePool();
  await ensureSchema(pool);

  const res = await pool.query<Record<string, unknown>>(
    `select * from ${PAYLINK_SETTLEMENTS_TABLE} where transfer_reference = $1 limit 1`,
    [reference]
  );
  return res.rows[0] ? rowToSettlement(res.rows[0]) : null;
}

export async function getSettlementByProcessorTransferId(transferId: string) {
  const pool = requirePool();
  await ensureSchema(pool);

  const res = await pool.query<Record<string, unknown>>(
    `select * from ${PAYLINK_SETTLEMENTS_TABLE} where processor_transfer_id = $1 limit 1`,
    [transferId]
  );
  return res.rows[0] ? rowToSettlement(res.rows[0]) : null;
}

export async function ensurePaylinkSettlement(input: {
  payment: PaylinkPaymentRecord;
  paylink: PaylinkRecord;
}) {
  const pool = requirePool();
  await ensureSchema(pool);

  const existing = await getSettlementByPaymentId(input.payment.id);
  if (existing) return existing;

  const amountKobo = Math.max(0, input.payment.netAmountKobo);
  const now = new Date().toISOString();
  const res = await pool.query<Record<string, unknown>>(
    `
      insert into ${PAYLINK_SETTLEMENTS_TABLE} (
        id, paylink_id, payment_id, processor, transfer_reference, status,
        amount_kobo, currency, recipient_name, recipient_nuban, recipient_bank, recipient_bank_code,
        processor_response, created_at, updated_at
      ) values (
        $1,$2,$3,'flutterwave',$4,'queued',
        $5,'NGN',$6,$7,$8,$9,
        $10,$11,$12
      )
      on conflict (payment_id) do nothing
      returning *
    `,
    [
      newId("plset"),
      input.paylink.id,
      input.payment.id,
      `ntset_${input.payment.txRef}`,
      amountKobo,
      input.paylink.recipientName,
      input.paylink.recipientNuban,
      input.paylink.recipientBank,
      input.paylink.recipientBankCode,
      JSON.stringify({ createdBeforeTransferCall: true }),
      now,
      now,
    ]
  );

  if (res.rows[0]) return rowToSettlement(res.rows[0]);
  const afterInsert = await getSettlementByPaymentId(input.payment.id);
  if (!afterInsert) throw new Error("settlement_create_failed");
  return afterInsert;
}

export async function markSettlementProcessing({
  settlementId,
  processorTransferId,
  processorBeneficiaryId,
  processorResponse,
}: {
  settlementId: string;
  processorTransferId?: string;
  processorBeneficiaryId?: string;
  processorResponse?: Record<string, unknown>;
}) {
  const pool = requirePool();
  await ensureSchema(pool);
  const now = new Date().toISOString();
  const res = await pool.query<Record<string, unknown>>(
    `
      update ${PAYLINK_SETTLEMENTS_TABLE}
      set status = 'processing',
          processor_transfer_id = coalesce($2, processor_transfer_id),
          processor_beneficiary_id = coalesce($3, processor_beneficiary_id),
          processor_response = processor_response || $4::jsonb,
          initiated_at = coalesce(initiated_at, $5),
          updated_at = $5
      where id = $1
      returning *
    `,
    [
      settlementId,
      processorTransferId ?? null,
      processorBeneficiaryId ?? null,
      JSON.stringify(processorResponse ?? {}),
      now,
    ]
  );
  return res.rows[0] ? rowToSettlement(res.rows[0]) : null;
}

export async function markSettlementSuccessful({
  settlementId,
  processorTransferId,
  processorResponse,
}: {
  settlementId: string;
  processorTransferId?: string;
  processorResponse?: Record<string, unknown>;
}) {
  const pool = requirePool();
  await ensureSchema(pool);
  const now = new Date().toISOString();
  const res = await pool.query<Record<string, unknown>>(
    `
      update ${PAYLINK_SETTLEMENTS_TABLE}
      set status = 'successful',
          processor_transfer_id = coalesce($2, processor_transfer_id),
          processor_response = processor_response || $3::jsonb,
          completed_at = coalesce(completed_at, $4),
          updated_at = $4
      where id = $1
      returning *
    `,
    [settlementId, processorTransferId ?? null, JSON.stringify(processorResponse ?? {}), now]
  );
  return res.rows[0] ? rowToSettlement(res.rows[0]) : null;
}

export async function markSettlementSkipped({
  settlementId,
  reason,
  processorResponse,
}: {
  settlementId: string;
  reason: string;
  processorResponse?: Record<string, unknown>;
}) {
  const pool = requirePool();
  await ensureSchema(pool);
  const now = new Date().toISOString();
  const res = await pool.query<Record<string, unknown>>(
    `
      update ${PAYLINK_SETTLEMENTS_TABLE}
      set status = 'skipped',
          failure_reason = $2,
          processor_response = processor_response || $3::jsonb,
          completed_at = coalesce(completed_at, $4),
          updated_at = $4
      where id = $1
      returning *
    `,
    [settlementId, reason, JSON.stringify(processorResponse ?? {}), now]
  );
  return res.rows[0] ? rowToSettlement(res.rows[0]) : null;
}

export async function markSettlementFailed({
  settlementId,
  failureReason,
  processorTransferId,
  processorResponse,
}: {
  settlementId: string;
  failureReason: string;
  processorTransferId?: string;
  processorResponse?: Record<string, unknown>;
}) {
  const pool = requirePool();
  await ensureSchema(pool);
  const now = new Date().toISOString();
  const res = await pool.query<Record<string, unknown>>(
    `
      update ${PAYLINK_SETTLEMENTS_TABLE}
      set status = 'failed',
          failure_reason = $2,
          processor_transfer_id = coalesce($3, processor_transfer_id),
          processor_response = processor_response || $4::jsonb,
          updated_at = $5
      where id = $1
      returning *
    `,
    [
      settlementId,
      failureReason,
      processorTransferId ?? null,
      JSON.stringify(processorResponse ?? {}),
      now,
    ]
  );
  return res.rows[0] ? rowToSettlement(res.rows[0]) : null;
}

export async function listPaylinkPaymentsForOwner({
  ownerId,
  limit = 50,
}: {
  ownerId: string;
  limit?: number;
}) {
  const pool = requirePool();
  await ensureSchema(pool);

  const res = await pool.query<Record<string, unknown>>(
    `
      select * from ${PAYLINK_PAYMENTS_TABLE}
      where owner_id = $1
      order by created_at desc
      limit $2
    `,
    [ownerId, Math.min(Math.max(limit, 1), 100)]
  );
  return res.rows.map(rowToPayment);
}

export async function listPaylinkSettlementsForOwner({
  ownerId,
  limit = 50,
}: {
  ownerId: string;
  limit?: number;
}) {
  const pool = requirePool();
  await ensureSchema(pool);

  const res = await pool.query<Record<string, unknown>>(
    `
      select s.*
      from ${PAYLINK_SETTLEMENTS_TABLE} s
      inner join ${PAYLINK_PAYMENTS_TABLE} p on p.id = s.payment_id
      where p.owner_id = $1
      order by s.created_at desc
      limit $2
    `,
    [ownerId, Math.min(Math.max(limit, 1), 100)]
  );
  return res.rows.map(rowToSettlement);
}

export async function getPaylinksDashboard(ownerId: string): Promise<PaylinksDashboardData> {
  const [paylinks, payments, settlements] = await Promise.all([
    listPaylinksForOwner({ ownerId, limit: 100 }),
    listPaylinkPaymentsForOwner({ ownerId, limit: 100 }),
    listPaylinkSettlementsForOwner({ ownerId, limit: 100 }),
  ]);

  const successfulPayments = payments.filter((item) => item.status === "paid");
  const successfulSettlements = settlements.filter((item) => item.status === "successful");
  const outstandingSettlements = settlements.filter(
    (item) => item.status === "queued" || item.status === "processing"
  );

  return {
    paylinks,
    payments,
    settlements,
    summary: {
      totalPaylinks: paylinks.length,
      activePaylinks: paylinks.filter((item) => item.status === "active").length,
      totalPayments: payments.length,
      successfulPayments: successfulPayments.length,
      grossVolumeKobo: successfulPayments.reduce((sum, item) => sum + item.amountKobo, 0),
      settledVolumeKobo: successfulSettlements.reduce(
        (sum, item) => sum + item.amountKobo,
        0
      ),
      outstandingSettlementsKobo: outstandingSettlements.reduce(
        (sum, item) => sum + item.amountKobo,
        0
      ),
    },
  };
}

export async function getPaylinkReceiptByPaymentId(
  paymentId: string,
  ownerId?: string
): Promise<PaylinkReceiptView | null> {
  const payment = await getPaylinkPaymentById(paymentId);
  if (!payment) return null;
  if (ownerId && payment.ownerId !== ownerId) return null;

  const [paylink, settlement] = await Promise.all([
    getPaylinkByShortCode(payment.paylinkShortCode),
    getSettlementByPaymentId(payment.id),
  ]);
  if (!paylink) return null;

  return {
    paylink,
    payment,
    settlement,
  };
}
