import { Pool, type PoolClient } from "pg";

import type { AdminData } from "./adminStore";

const LEGACY_TABLE = "nairatag_admin_state";
const USERS_TABLE = "nt_phase0_users";
const HANDLES_TABLE = "nt_phase0_handles";
const API_LOGS_TABLE = "nt_phase0_api_logs";
const OTPS_TABLE = "nt_phase0_otps";
const BANK_ACCOUNTS_TABLE = "nt_phase0_bank_accounts";
const TRANSACTIONS_TABLE = "nt_phase1_transactions";
const MARKETPLACE_LISTINGS_TABLE = "nt_marketplace_listings";
const MARKETPLACE_OFFERS_TABLE = "nt_marketplace_offers";

declare global {
  var __nairatagAdminPool: Pool | undefined;
}

function databaseUrl() {
  return process.env.DATABASE_URL?.trim() || "";
}

function canUseDatabase() {
  return Boolean(databaseUrl());
}

function getPool() {
  if (!canUseDatabase()) return null;
  if (!global.__nairatagAdminPool) {
    global.__nairatagAdminPool = new Pool({
      connectionString: databaseUrl(),
      ssl: { rejectUnauthorized: false },
      max: 3,
    });
  }
  return global.__nairatagAdminPool;
}

async function ensureSchema() {
  const pool = getPool();
  if (!pool) return;
  await pool.query(`
    create table if not exists ${LEGACY_TABLE} (
      id smallint primary key check (id = 1),
      payload jsonb not null,
      updated_at timestamptz not null default now()
    )
  `);
  await pool.query(`
    create table if not exists ${USERS_TABLE} (
      id text primary key,
      phone text not null unique,
      created_at timestamptz not null,
      phone_verified_at timestamptz,
      full_name text,
      bvn_last4 text,
      bvn_linked_at timestamptz,
      bank_linked_at timestamptz,
      geo jsonb
    )
  `);
  await pool.query(
    `alter table ${USERS_TABLE} add column if not exists bank_linked_at timestamptz`
  );
  await pool.query(`
    create table if not exists ${HANDLES_TABLE} (
      id text primary key,
      handle text not null unique,
      display_name text not null,
      bank text not null,
      verification text not null,
      claimed_at timestamptz not null,
      source text not null,
      user_id text,
      phone text,
      verified_at timestamptz
    )
  `);
  await pool.query(
    `create index if not exists ${HANDLES_TABLE}_handle_idx on ${HANDLES_TABLE}(handle)`
  );
  await pool.query(
    `create index if not exists ${HANDLES_TABLE}_user_id_idx on ${HANDLES_TABLE}(user_id)`
  );
  await pool.query(`
    create table if not exists ${API_LOGS_TABLE} (
      id text primary key,
      ts timestamptz not null,
      endpoint text not null,
      method text not null,
      status integer not null,
      latency_ms integer not null,
      handle text,
      client_key text
    )
  `);
  await pool.query(
    `create index if not exists ${API_LOGS_TABLE}_ts_idx on ${API_LOGS_TABLE}(ts desc)`
  );
  await pool.query(
    `create index if not exists ${API_LOGS_TABLE}_endpoint_idx on ${API_LOGS_TABLE}(endpoint)`
  );
  await pool.query(`
    create table if not exists ${OTPS_TABLE} (
      id text primary key,
      phone text not null,
      code_hash text not null,
      created_at timestamptz not null,
      expires_at timestamptz not null,
      consumed_at timestamptz,
      attempts integer not null default 0,
      last_attempt_at timestamptz,
      ip text,
      user_agent text,
      dev_code text
    )
  `);
  await pool.query(
    `create index if not exists ${OTPS_TABLE}_phone_idx on ${OTPS_TABLE}(phone)`
  );
  await pool.query(
    `create index if not exists ${OTPS_TABLE}_created_at_idx on ${OTPS_TABLE}(created_at desc)`
  );
  await pool.query(`
    create table if not exists ${BANK_ACCOUNTS_TABLE} (
      id text primary key,
      user_id text not null unique,
      bank_code text not null,
      bank_name text not null,
      nip_code text,
      account_name text,
      account_number_masked text not null,
      account_number_last4 text not null,
      account_number_encrypted text not null,
      provider text not null,
      status text not null,
      linked_at timestamptz not null,
      verified_at timestamptz,
      lookup_message text
    )
  `);
  await pool.query(
    `create index if not exists ${BANK_ACCOUNTS_TABLE}_linked_at_idx on ${BANK_ACCOUNTS_TABLE}(linked_at desc)`
  );
  await pool.query(`
    create table if not exists ${TRANSACTIONS_TABLE} (
      id text primary key,
      handle text not null,
      user_id text,
      counterparty_handle text,
      amount integer not null,
      currency text not null,
      channel text not null,
      status text not null,
      reference text,
      note text,
      sender_name text,
      sender_phone text,
      recorded_at timestamptz not null,
      settled_at timestamptz,
      disputed_at timestamptz,
      metadata jsonb
    )
  `);
  await pool.query(
    `create index if not exists ${TRANSACTIONS_TABLE}_handle_idx on ${TRANSACTIONS_TABLE}(handle)`
  );
  await pool.query(
    `create index if not exists ${TRANSACTIONS_TABLE}_user_id_idx on ${TRANSACTIONS_TABLE}(user_id)`
  );
  await pool.query(
    `create index if not exists ${TRANSACTIONS_TABLE}_recorded_at_idx on ${TRANSACTIONS_TABLE}(recorded_at desc)`
  );
  await pool.query(`
    create table if not exists ${MARKETPLACE_LISTINGS_TABLE} (
      id text primary key,
      handle text not null unique,
      seller_user_id text not null,
      sale_mode text not null,
      ask_amount integer,
      min_offer_amount integer,
      status text not null,
      seller_note text,
      commission_bps integer not null,
      created_at timestamptz not null,
      updated_at timestamptz not null,
      published_at timestamptz not null,
      review_started_at timestamptz,
      withdrawn_at timestamptz
    )
  `);
  await pool.query(
    `create index if not exists ${MARKETPLACE_LISTINGS_TABLE}_seller_idx on ${MARKETPLACE_LISTINGS_TABLE}(seller_user_id)`
  );
  await pool.query(
    `create index if not exists ${MARKETPLACE_LISTINGS_TABLE}_status_idx on ${MARKETPLACE_LISTINGS_TABLE}(status)`
  );
  await pool.query(`
    create table if not exists ${MARKETPLACE_OFFERS_TABLE} (
      id text primary key,
      listing_id text not null,
      handle text not null,
      buyer_user_id text,
      buyer_name text not null,
      buyer_phone text not null,
      amount integer not null,
      note text,
      status text not null,
      created_at timestamptz not null,
      updated_at timestamptz not null,
      responded_at timestamptz
    )
  `);
  await pool.query(
    `create index if not exists ${MARKETPLACE_OFFERS_TABLE}_listing_idx on ${MARKETPLACE_OFFERS_TABLE}(listing_id)`
  );
  await pool.query(
    `create index if not exists ${MARKETPLACE_OFFERS_TABLE}_status_idx on ${MARKETPLACE_OFFERS_TABLE}(status)`
  );
}

async function countRows(client: PoolClient, table: string) {
  const result = await client.query<{ count: string }>(
    `select count(*)::text as count from ${table}`
  );
  return Number(result.rows[0]?.count ?? "0");
}

async function hasNormalizedData(client: PoolClient) {
  const counts = [
    await countRows(client, USERS_TABLE),
    await countRows(client, HANDLES_TABLE),
    await countRows(client, API_LOGS_TABLE),
    await countRows(client, OTPS_TABLE),
    await countRows(client, BANK_ACCOUNTS_TABLE),
    await countRows(client, TRANSACTIONS_TABLE),
    await countRows(client, MARKETPLACE_LISTINGS_TABLE),
    await countRows(client, MARKETPLACE_OFFERS_TABLE),
  ];

  return counts.some((count) => count > 0);
}

function normalizeData(data: Partial<AdminData> | null | undefined): AdminData {
  return {
    claims: Array.isArray(data?.claims) ? data.claims : [],
    apiLogs: Array.isArray(data?.apiLogs) ? data.apiLogs : [],
    users: Array.isArray(data?.users) ? data.users : [],
    otps: Array.isArray(data?.otps) ? data.otps : [],
    bankAccounts: Array.isArray(data?.bankAccounts) ? data.bankAccounts : [],
    transactions: Array.isArray(data?.transactions) ? data.transactions : [],
    marketplaceListings: Array.isArray(data?.marketplaceListings)
      ? data.marketplaceListings
      : [],
    marketplaceOffers: Array.isArray(data?.marketplaceOffers)
      ? data.marketplaceOffers
      : [],
  };
}

async function replaceTable(
  client: PoolClient,
  table: string,
  columns: string[],
  rows: Array<unknown[]>
) {
  await client.query(`delete from ${table}`);
  if (rows.length === 0) return;

  const values: unknown[] = [];
  const placeholders = rows
    .map((row, rowIndex) => {
      const offset = rowIndex * columns.length;
      row.forEach((value) => values.push(value));
      return `(${columns.map((_, colIndex) => `$${offset + colIndex + 1}`).join(", ")})`;
    })
    .join(", ");

  await client.query(
    `insert into ${table} (${columns.join(", ")}) values ${placeholders}`,
    values
  );
}

async function replaceSnapshot(client: PoolClient, data: AdminData) {
  await replaceTable(
    client,
    USERS_TABLE,
    [
      "id",
      "phone",
      "created_at",
      "phone_verified_at",
      "full_name",
      "bvn_last4",
      "bvn_linked_at",
      "bank_linked_at",
      "geo",
    ],
    data.users.map((user) => [
      user.id,
      user.phone,
      user.createdAt,
      user.phoneVerifiedAt,
      user.fullName ?? null,
      user.bvnLast4 ?? null,
      user.bvnLinkedAt ?? null,
      user.bankLinkedAt ?? null,
      user.geo ?? null,
    ])
  );

  await replaceTable(
    client,
    HANDLES_TABLE,
    [
      "id",
      "handle",
      "display_name",
      "bank",
      "verification",
      "claimed_at",
      "source",
      "user_id",
      "phone",
      "verified_at",
    ],
    data.claims.map((claim) => [
      claim.id,
      claim.handle,
      claim.displayName,
      claim.bank,
      claim.verification,
      claim.claimedAt,
      claim.source,
      claim.userId ?? null,
      claim.phone ?? null,
      claim.verifiedAt ?? null,
    ])
  );

  await replaceTable(
    client,
    API_LOGS_TABLE,
    ["id", "ts", "endpoint", "method", "status", "latency_ms", "handle", "client_key"],
    data.apiLogs.map((log) => [
      log.id,
      log.ts,
      log.endpoint,
      log.method,
      log.status,
      log.latencyMs,
      log.handle ?? null,
      log.clientKey ?? null,
    ])
  );

  await replaceTable(
    client,
    OTPS_TABLE,
    [
      "id",
      "phone",
      "code_hash",
      "created_at",
      "expires_at",
      "consumed_at",
      "attempts",
      "last_attempt_at",
      "ip",
      "user_agent",
      "dev_code",
    ],
    data.otps.map((otp) => [
      otp.id,
      otp.phone,
      otp.codeHash,
      otp.createdAt,
      otp.expiresAt,
      otp.consumedAt ?? null,
      otp.attempts,
      otp.lastAttemptAt ?? null,
      otp.ip ?? null,
      otp.userAgent ?? null,
      otp.devCode ?? null,
    ])
  );

  await replaceTable(
    client,
    BANK_ACCOUNTS_TABLE,
    [
      "id",
      "user_id",
      "bank_code",
      "bank_name",
      "nip_code",
      "account_name",
      "account_number_masked",
      "account_number_last4",
      "account_number_encrypted",
      "provider",
      "status",
      "linked_at",
      "verified_at",
      "lookup_message",
    ],
    data.bankAccounts.map((bankAccount) => [
      bankAccount.id,
      bankAccount.userId,
      bankAccount.bankCode,
      bankAccount.bankName,
      bankAccount.nipCode ?? null,
      bankAccount.accountName ?? null,
      bankAccount.accountNumberMasked,
      bankAccount.accountNumberLast4,
      bankAccount.accountNumberEncrypted,
      bankAccount.provider,
      bankAccount.status,
      bankAccount.linkedAt,
      bankAccount.verifiedAt ?? null,
      bankAccount.lookupMessage ?? null,
    ])
  );

  await replaceTable(
    client,
    TRANSACTIONS_TABLE,
    [
      "id",
      "handle",
      "user_id",
      "counterparty_handle",
      "amount",
      "currency",
      "channel",
      "status",
      "reference",
      "note",
      "sender_name",
      "sender_phone",
      "recorded_at",
      "settled_at",
      "disputed_at",
      "metadata",
    ],
    data.transactions.map((transaction) => [
      transaction.id,
      transaction.handle,
      transaction.userId ?? null,
      transaction.counterpartyHandle ?? null,
      transaction.amount,
      transaction.currency,
      transaction.channel,
      transaction.status,
      transaction.reference ?? null,
      transaction.note ?? null,
      transaction.senderName ?? null,
      transaction.senderPhone ?? null,
      transaction.recordedAt,
      transaction.settledAt ?? null,
      transaction.disputedAt ?? null,
      transaction.metadata ?? null,
    ])
  );

  await replaceTable(
    client,
    MARKETPLACE_LISTINGS_TABLE,
    [
      "id",
      "handle",
      "seller_user_id",
      "sale_mode",
      "ask_amount",
      "min_offer_amount",
      "status",
      "seller_note",
      "commission_bps",
      "created_at",
      "updated_at",
      "published_at",
      "review_started_at",
      "withdrawn_at",
    ],
    data.marketplaceListings.map((listing) => [
      listing.id,
      listing.handle,
      listing.sellerUserId,
      listing.saleMode,
      listing.askAmount ?? null,
      listing.minOfferAmount ?? null,
      listing.status,
      listing.sellerNote ?? null,
      listing.commissionBps,
      listing.createdAt,
      listing.updatedAt,
      listing.publishedAt,
      listing.reviewStartedAt ?? null,
      listing.withdrawnAt ?? null,
    ])
  );

  await replaceTable(
    client,
    MARKETPLACE_OFFERS_TABLE,
    [
      "id",
      "listing_id",
      "handle",
      "buyer_user_id",
      "buyer_name",
      "buyer_phone",
      "amount",
      "note",
      "status",
      "created_at",
      "updated_at",
      "responded_at",
    ],
    data.marketplaceOffers.map((offer) => [
      offer.id,
      offer.listingId,
      offer.handle,
      offer.buyerUserId ?? null,
      offer.buyerName,
      offer.buyerPhone,
      offer.amount,
      offer.note ?? null,
      offer.status,
      offer.createdAt,
      offer.updatedAt,
      offer.respondedAt ?? null,
    ])
  );
}

async function readLegacySnapshot(client: PoolClient): Promise<AdminData | null> {
  const result = await client.query<{ payload: AdminData }>(
    `select payload from ${LEGACY_TABLE} where id = 1 limit 1`
  );
  return normalizeData(result.rows[0]?.payload ?? null);
}

async function migrateLegacySnapshotIfNeeded(client: PoolClient) {
  if (await hasNormalizedData(client)) return;

  const legacy = await readLegacySnapshot(client);
  const hasLegacyData =
    legacy.claims.length > 0 ||
    legacy.apiLogs.length > 0 ||
    legacy.users.length > 0 ||
    legacy.otps.length > 0 ||
    legacy.bankAccounts.length > 0 ||
    legacy.transactions.length > 0 ||
    legacy.marketplaceListings.length > 0 ||
    legacy.marketplaceOffers.length > 0;

  if (!hasLegacyData) return;

  await replaceSnapshot(client, legacy);
}

function mapRowsToSnapshot(rows: {
  users: Array<{
    id: string;
    phone: string;
    created_at: string;
    phone_verified_at: string;
    full_name: string | null;
    bvn_last4: string | null;
    bvn_linked_at: string | null;
    bank_linked_at: string | null;
    geo: AdminData["users"][number]["geo"] | null;
  }>;
  claims: Array<{
    id: string;
    handle: string;
    display_name: string;
    bank: string;
    verification: AdminData["claims"][number]["verification"];
    claimed_at: string;
    source: "web" | "api";
    user_id: string | null;
    phone: string | null;
    verified_at: string | null;
  }>;
  apiLogs: Array<{
    id: string;
    ts: string;
    endpoint: string;
    method: string;
    status: number;
    latency_ms: number;
    handle: string | null;
    client_key: string | null;
  }>;
  otps: Array<{
    id: string;
    phone: string;
    code_hash: string;
    created_at: string;
    expires_at: string;
    consumed_at: string | null;
    attempts: number;
    last_attempt_at: string | null;
    ip: string | null;
    user_agent: string | null;
    dev_code: string | null;
  }>;
  bankAccounts: Array<{
    id: string;
    user_id: string;
    bank_code: string;
    bank_name: string;
    nip_code: string | null;
    account_name: string | null;
    account_number_masked: string;
    account_number_last4: string;
    account_number_encrypted: string;
    provider: "mono" | "manual";
    status: AdminData["bankAccounts"][number]["status"];
    linked_at: string;
    verified_at: string | null;
    lookup_message: string | null;
  }>;
  transactions: Array<{
    id: string;
    handle: string;
    user_id: string | null;
    counterparty_handle: string | null;
    amount: number;
    currency: "NGN";
    channel: AdminData["transactions"][number]["channel"];
    status: AdminData["transactions"][number]["status"];
    reference: string | null;
    note: string | null;
    sender_name: string | null;
    sender_phone: string | null;
    recorded_at: string;
    settled_at: string | null;
    disputed_at: string | null;
    metadata: AdminData["transactions"][number]["metadata"] | null;
  }>;
  marketplaceListings: Array<{
    id: string;
    handle: string;
    seller_user_id: string;
    sale_mode: AdminData["marketplaceListings"][number]["saleMode"];
    ask_amount: number | null;
    min_offer_amount: number | null;
    status: AdminData["marketplaceListings"][number]["status"];
    seller_note: string | null;
    commission_bps: number;
    created_at: string;
    updated_at: string;
    published_at: string;
    review_started_at: string | null;
    withdrawn_at: string | null;
  }>;
  marketplaceOffers: Array<{
    id: string;
    listing_id: string;
    handle: string;
    buyer_user_id: string | null;
    buyer_name: string;
    buyer_phone: string;
    amount: number;
    note: string | null;
    status: AdminData["marketplaceOffers"][number]["status"];
    created_at: string;
    updated_at: string;
    responded_at: string | null;
  }>;
}): AdminData {
  const toIso = (value: Date | string | null | undefined) =>
    value == null ? undefined : new Date(value).toISOString();

  return {
    users: rows.users.map((user) => ({
      id: user.id,
      phone: user.phone,
      createdAt: toIso(user.created_at) ?? new Date().toISOString(),
      phoneVerifiedAt:
        toIso(user.phone_verified_at) ??
        toIso(user.created_at) ??
        new Date().toISOString(),
      fullName: user.full_name ?? undefined,
      bvnLast4: user.bvn_last4 ?? undefined,
      bvnLinkedAt: toIso(user.bvn_linked_at),
      bankLinkedAt: toIso(user.bank_linked_at),
      geo: user.geo ?? undefined,
    })),
    claims: rows.claims.map((claim) => ({
      id: claim.id,
      handle: claim.handle,
      displayName: claim.display_name,
      bank: claim.bank,
      verification: claim.verification,
      claimedAt: toIso(claim.claimed_at) ?? new Date().toISOString(),
      source: claim.source,
      userId: claim.user_id ?? undefined,
      phone: claim.phone ?? undefined,
      verifiedAt: toIso(claim.verified_at),
    })),
    apiLogs: rows.apiLogs.map((log) => ({
      id: log.id,
      ts: toIso(log.ts) ?? new Date().toISOString(),
      endpoint: log.endpoint,
      method: log.method,
      status: log.status,
      latencyMs: log.latency_ms,
      handle: log.handle ?? undefined,
      clientKey: log.client_key ?? undefined,
    })),
    otps: rows.otps.map((otp) => ({
      id: otp.id,
      phone: otp.phone,
      codeHash: otp.code_hash,
      createdAt: toIso(otp.created_at) ?? new Date().toISOString(),
      expiresAt: toIso(otp.expires_at) ?? new Date().toISOString(),
      consumedAt: toIso(otp.consumed_at),
      attempts: otp.attempts,
      lastAttemptAt: toIso(otp.last_attempt_at),
      ip: otp.ip ?? undefined,
      userAgent: otp.user_agent ?? undefined,
      devCode: otp.dev_code ?? undefined,
    })),
    bankAccounts: rows.bankAccounts.map((bankAccount) => ({
      id: bankAccount.id,
      userId: bankAccount.user_id,
      bankCode: bankAccount.bank_code,
      bankName: bankAccount.bank_name,
      nipCode: bankAccount.nip_code ?? undefined,
      accountName: bankAccount.account_name ?? undefined,
      accountNumberMasked: bankAccount.account_number_masked,
      accountNumberLast4: bankAccount.account_number_last4,
      accountNumberEncrypted: bankAccount.account_number_encrypted,
      provider: bankAccount.provider,
      status: bankAccount.status,
      linkedAt: toIso(bankAccount.linked_at) ?? new Date().toISOString(),
      verifiedAt: toIso(bankAccount.verified_at),
      lookupMessage: bankAccount.lookup_message ?? undefined,
    })),
    transactions: rows.transactions.map((transaction) => ({
      id: transaction.id,
      handle: transaction.handle,
      userId: transaction.user_id ?? undefined,
      counterpartyHandle: transaction.counterparty_handle ?? undefined,
      amount: transaction.amount,
      currency: transaction.currency,
      channel: transaction.channel,
      status: transaction.status,
      reference: transaction.reference ?? undefined,
      note: transaction.note ?? undefined,
      senderName: transaction.sender_name ?? undefined,
      senderPhone: transaction.sender_phone ?? undefined,
      recordedAt: toIso(transaction.recorded_at) ?? new Date().toISOString(),
      settledAt: toIso(transaction.settled_at),
      disputedAt: toIso(transaction.disputed_at),
      metadata: transaction.metadata ?? undefined,
    })),
    marketplaceListings: rows.marketplaceListings.map((listing) => ({
      id: listing.id,
      handle: listing.handle,
      sellerUserId: listing.seller_user_id,
      saleMode: listing.sale_mode,
      askAmount: listing.ask_amount ?? undefined,
      minOfferAmount: listing.min_offer_amount ?? undefined,
      status: listing.status,
      sellerNote: listing.seller_note ?? undefined,
      commissionBps: listing.commission_bps,
      createdAt: toIso(listing.created_at) ?? new Date().toISOString(),
      updatedAt: toIso(listing.updated_at) ?? new Date().toISOString(),
      publishedAt: toIso(listing.published_at) ?? new Date().toISOString(),
      reviewStartedAt: toIso(listing.review_started_at),
      withdrawnAt: toIso(listing.withdrawn_at),
    })),
    marketplaceOffers: rows.marketplaceOffers.map((offer) => ({
      id: offer.id,
      listingId: offer.listing_id,
      handle: offer.handle,
      buyerUserId: offer.buyer_user_id ?? undefined,
      buyerName: offer.buyer_name,
      buyerPhone: offer.buyer_phone,
      amount: offer.amount,
      note: offer.note ?? undefined,
      status: offer.status,
      createdAt: toIso(offer.created_at) ?? new Date().toISOString(),
      updatedAt: toIso(offer.updated_at) ?? new Date().toISOString(),
      respondedAt: toIso(offer.responded_at),
    })),
  };
}

export function isDatabaseBackedAdminStoreEnabled() {
  return canUseDatabase();
}

export async function readAdminStateFromDatabase(): Promise<AdminData | null> {
  const pool = getPool();
  if (!pool) return null;

  await ensureSchema();
  const client = await pool.connect();

  try {
    await migrateLegacySnapshotIfNeeded(client);

    if (!(await hasNormalizedData(client))) {
      return null;
    }

    const users = await client.query<{
      id: string;
      phone: string;
      created_at: string;
      phone_verified_at: string;
      full_name: string | null;
      bvn_last4: string | null;
      bvn_linked_at: string | null;
      bank_linked_at: string | null;
      geo: AdminData["users"][number]["geo"] | null;
    }>(`select * from ${USERS_TABLE} order by created_at desc`);
    const claims = await client.query<{
      id: string;
      handle: string;
      display_name: string;
      bank: string;
      verification: AdminData["claims"][number]["verification"];
      claimed_at: string;
      source: "web" | "api";
      user_id: string | null;
      phone: string | null;
      verified_at: string | null;
    }>(`select * from ${HANDLES_TABLE} order by claimed_at desc`);
    const apiLogs = await client.query<{
      id: string;
      ts: string;
      endpoint: string;
      method: string;
      status: number;
      latency_ms: number;
      handle: string | null;
      client_key: string | null;
    }>(`select * from ${API_LOGS_TABLE} order by ts desc`);
    const otps = await client.query<{
      id: string;
      phone: string;
      code_hash: string;
      created_at: string;
      expires_at: string;
      consumed_at: string | null;
      attempts: number;
      last_attempt_at: string | null;
      ip: string | null;
      user_agent: string | null;
      dev_code: string | null;
    }>(`select * from ${OTPS_TABLE} order by created_at desc`);
    const bankAccounts = await client.query<{
      id: string;
      user_id: string;
      bank_code: string;
      bank_name: string;
      nip_code: string | null;
      account_name: string | null;
      account_number_masked: string;
      account_number_last4: string;
      account_number_encrypted: string;
      provider: "mono" | "manual";
      status: AdminData["bankAccounts"][number]["status"];
      linked_at: string;
      verified_at: string | null;
      lookup_message: string | null;
    }>(`select * from ${BANK_ACCOUNTS_TABLE} order by linked_at desc`);
    const transactions = await client.query<{
      id: string;
      handle: string;
      user_id: string | null;
      counterparty_handle: string | null;
      amount: number;
      currency: "NGN";
      channel: AdminData["transactions"][number]["channel"];
      status: AdminData["transactions"][number]["status"];
      reference: string | null;
      note: string | null;
      sender_name: string | null;
      sender_phone: string | null;
      recorded_at: string;
      settled_at: string | null;
      disputed_at: string | null;
      metadata: AdminData["transactions"][number]["metadata"] | null;
    }>(`select * from ${TRANSACTIONS_TABLE} order by recorded_at desc`);
    const marketplaceListings = await client.query<{
      id: string;
      handle: string;
      seller_user_id: string;
      sale_mode: AdminData["marketplaceListings"][number]["saleMode"];
      ask_amount: number | null;
      min_offer_amount: number | null;
      status: AdminData["marketplaceListings"][number]["status"];
      seller_note: string | null;
      commission_bps: number;
      created_at: string;
      updated_at: string;
      published_at: string;
      review_started_at: string | null;
      withdrawn_at: string | null;
    }>(`select * from ${MARKETPLACE_LISTINGS_TABLE} order by published_at desc`);
    const marketplaceOffers = await client.query<{
      id: string;
      listing_id: string;
      handle: string;
      buyer_user_id: string | null;
      buyer_name: string;
      buyer_phone: string;
      amount: number;
      note: string | null;
      status: AdminData["marketplaceOffers"][number]["status"];
      created_at: string;
      updated_at: string;
      responded_at: string | null;
    }>(`select * from ${MARKETPLACE_OFFERS_TABLE} order by created_at desc`);

    return mapRowsToSnapshot({
      users: users.rows,
      claims: claims.rows,
      apiLogs: apiLogs.rows,
      otps: otps.rows,
      bankAccounts: bankAccounts.rows,
      transactions: transactions.rows,
      marketplaceListings: marketplaceListings.rows,
      marketplaceOffers: marketplaceOffers.rows,
    });
  } finally {
    client.release();
  }
}

export async function writeAdminStateToDatabase(data: AdminData) {
  const pool = getPool();
  if (!pool) return false;

  await ensureSchema();
  const client = await pool.connect();

  try {
    await client.query("begin");
    await replaceSnapshot(client, normalizeData(data));
    await client.query(
      `
        insert into ${LEGACY_TABLE} (id, payload, updated_at)
        values (1, $1::jsonb, now())
        on conflict (id)
        do update set payload = excluded.payload, updated_at = now()
      `,
      [JSON.stringify(data)]
    );
    await client.query("commit");
    return true;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
