import { Pool, type PoolClient } from "pg";

import type { AdminData } from "./adminStore";

const LEGACY_TABLE = "nairatag_admin_state";
const USERS_TABLE = "nt_phase0_users";
const HANDLES_TABLE = "nt_phase0_handles";
const API_LOGS_TABLE = "nt_phase0_api_logs";
const NOTIFICATIONS_TABLE = "nt_notifications";
const REFERRALS_TABLE = "nt_referrals";
const OTPS_TABLE = "nt_phase0_otps";
const BANK_ACCOUNTS_TABLE = "nt_phase0_bank_accounts";
const CRYPTO_WALLETS_TABLE = "crypto_wallets";
const HANDLE_SOCIALS_TABLE = "nt_handle_socials";
const TELEGRAM_VERIFICATIONS_TABLE = "nt_telegram_verifications";
const TELEGRAM_BOT_SESSIONS_TABLE = "nt_telegram_bot_sessions";
const TRANSACTIONS_TABLE = "nt_phase1_transactions";
const MARKETPLACE_LISTINGS_TABLE = "nt_marketplace_listings";
const MARKETPLACE_OFFERS_TABLE = "nt_marketplace_offers";
const MARKETPLACE_TRANSFERS_TABLE = "nt_marketplace_transfers";

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
      connectionTimeoutMillis: 2500,
      idleTimeoutMillis: 10000,
      query_timeout: 5000,
      statement_timeout: 5000,
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
      points_balance integer not null default 0,
      welcome_rewarded_at timestamptz,
      privy_user_id text,
      privy_linked_at timestamptz,
      email text,
      wallet_address text,
      telegram_user_id text,
      telegram_chat_id text,
      telegram_username text,
      telegram_linked_at timestamptz,
      full_name text,
      avatar_url text,
      bvn_last4 text,
      bvn_linked_at timestamptz,
      bank_linked_at timestamptz,
      geo jsonb
    )
  `);
  await pool.query(
    `alter table ${USERS_TABLE} add column if not exists points_balance integer not null default 0`
  );
  await pool.query(
    `alter table ${USERS_TABLE} add column if not exists welcome_rewarded_at timestamptz`
  );
  await pool.query(
    `alter table ${USERS_TABLE} add column if not exists bank_linked_at timestamptz`
  );
  await pool.query(
    `alter table ${USERS_TABLE} add column if not exists privy_user_id text`
  );
  await pool.query(
    `alter table ${USERS_TABLE} add column if not exists privy_linked_at timestamptz`
  );
  await pool.query(
    `alter table ${USERS_TABLE} add column if not exists email text`
  );
  await pool.query(
    `alter table ${USERS_TABLE} add column if not exists wallet_address text`
  );
  await pool.query(
    `alter table ${USERS_TABLE} add column if not exists telegram_user_id text`
  );
  await pool.query(
    `alter table ${USERS_TABLE} add column if not exists telegram_chat_id text`
  );
  await pool.query(
    `alter table ${USERS_TABLE} add column if not exists telegram_username text`
  );
  await pool.query(
    `alter table ${USERS_TABLE} add column if not exists telegram_linked_at timestamptz`
  );
  await pool.query(
    `alter table ${USERS_TABLE} add column if not exists avatar_url text`
  );
  await pool.query(
    `alter table ${USERS_TABLE} add column if not exists referral_code text`
  );
  await pool.query(
    `alter table ${USERS_TABLE} add column if not exists referred_by_user_id text`
  );
  await pool.query(
    `alter table ${USERS_TABLE} add column if not exists referred_at timestamptz`
  );
  await pool.query(
    `create unique index if not exists ${USERS_TABLE}_privy_user_id_idx on ${USERS_TABLE}(privy_user_id) where privy_user_id is not null`
  );
  await pool.query(
    `create unique index if not exists ${USERS_TABLE}_telegram_user_id_idx on ${USERS_TABLE}(telegram_user_id) where telegram_user_id is not null`
  );
  await pool.query(
    `create index if not exists ${USERS_TABLE}_referred_by_idx on ${USERS_TABLE}(referred_by_user_id)`
  );
  await pool.query(
    `create unique index if not exists ${USERS_TABLE}_referral_code_key on ${USERS_TABLE}(referral_code) where referral_code is not null`
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
    create table if not exists ${NOTIFICATIONS_TABLE} (
      id text primary key,
      user_id text,
      handle text,
      type text not null,
      title text not null,
      body text not null,
      priority text not null,
      status text not null,
      created_at timestamptz not null,
      read_at timestamptz,
      delivery_channels jsonb,
      delivery_status text,
      delivery_attempts integer not null default 0,
      last_delivery_attempt_at timestamptz,
      delivered_at timestamptz,
      delivery_error text,
      metadata jsonb
    )
  `);
  await pool.query(
    `alter table ${NOTIFICATIONS_TABLE} add column if not exists delivery_channels jsonb`
  );
  await pool.query(
    `alter table ${NOTIFICATIONS_TABLE} add column if not exists delivery_status text`
  );
  await pool.query(
    `alter table ${NOTIFICATIONS_TABLE} add column if not exists delivery_attempts integer not null default 0`
  );
  await pool.query(
    `alter table ${NOTIFICATIONS_TABLE} add column if not exists last_delivery_attempt_at timestamptz`
  );
  await pool.query(
    `alter table ${NOTIFICATIONS_TABLE} add column if not exists delivered_at timestamptz`
  );
  await pool.query(
    `alter table ${NOTIFICATIONS_TABLE} add column if not exists delivery_error text`
  );
  await pool.query(
    `create index if not exists ${NOTIFICATIONS_TABLE}_user_idx on ${NOTIFICATIONS_TABLE}(user_id, created_at desc)`
  );
  await pool.query(
    `create index if not exists ${NOTIFICATIONS_TABLE}_status_idx on ${NOTIFICATIONS_TABLE}(status)`
  );
  await pool.query(`
    create table if not exists ${REFERRALS_TABLE} (
      id text primary key,
      referrer_user_id text not null,
      referred_user_id text not null unique,
      referral_code text not null,
      source text not null,
      created_at timestamptz not null,
      converted_at timestamptz,
      signup_points integer not null default 25,
      conversion_points integer not null default 0
    )
  `);
  await pool.query(
    `alter table ${REFERRALS_TABLE} add column if not exists signup_points integer not null default 25`
  );
  await pool.query(
    `alter table ${REFERRALS_TABLE} add column if not exists conversion_points integer not null default 0`
  );
  await pool.query(
    `alter table ${REFERRALS_TABLE} alter column signup_points set default 25`
  );
  await pool.query(
    `update ${REFERRALS_TABLE} set signup_points = 25 where signup_points = 0`
  );
  await pool.query(
    `update ${REFERRALS_TABLE} set conversion_points = 100 where converted_at is not null and conversion_points = 0`
  );
  await pool.query(
    `create index if not exists ${REFERRALS_TABLE}_referrer_idx on ${REFERRALS_TABLE}(referrer_user_id)`
  );
  await pool.query(
    `create index if not exists ${REFERRALS_TABLE}_created_at_idx on ${REFERRALS_TABLE}(created_at desc)`
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
    create table if not exists ${CRYPTO_WALLETS_TABLE} (
      id text primary key,
      user_id text not null,
      handle text not null,
      display_handle text not null,
      wallet_address text not null,
      chain text not null,
      is_default boolean not null default true,
      wallet_verified boolean not null default true,
      signature_hash text not null,
      nonce text not null,
      created_at timestamptz not null,
      updated_at timestamptz not null
    )
  `);
  await pool.query(
    `create unique index if not exists ${CRYPTO_WALLETS_TABLE}_default_handle_chain_idx on ${CRYPTO_WALLETS_TABLE}(handle, chain) where is_default`
  );
  await pool.query(
    `create unique index if not exists ${CRYPTO_WALLETS_TABLE}_nonce_idx on ${CRYPTO_WALLETS_TABLE}(nonce)`
  );
  await pool.query(
    `create index if not exists ${CRYPTO_WALLETS_TABLE}_user_idx on ${CRYPTO_WALLETS_TABLE}(user_id)`
  );
  await pool.query(
    `create index if not exists ${CRYPTO_WALLETS_TABLE}_wallet_idx on ${CRYPTO_WALLETS_TABLE}(wallet_address)`
  );
  await pool.query(`
    create table if not exists ${HANDLE_SOCIALS_TABLE} (
      id text primary key,
      handle_id text not null,
      user_id text not null,
      handle text not null,
      platform text not null,
      username text not null,
      username_clean text not null,
      verified boolean not null default false,
      verified_at timestamptz,
      verification_code text,
      verification_expires_at timestamptz,
      ens_synced boolean not null default false,
      ens_synced_at timestamptz,
      ens_tx_hash text,
      status text not null,
      created_at timestamptz not null,
      updated_at timestamptz not null
    )
  `);
  await pool.query(
    `create index if not exists ${HANDLE_SOCIALS_TABLE}_handle_idx on ${HANDLE_SOCIALS_TABLE}(handle, platform, status)`
  );
  await pool.query(
    `create index if not exists ${HANDLE_SOCIALS_TABLE}_user_idx on ${HANDLE_SOCIALS_TABLE}(user_id, updated_at desc)`
  );
  await pool.query(
    `create unique index if not exists ${HANDLE_SOCIALS_TABLE}_username_active_idx on ${HANDLE_SOCIALS_TABLE}(platform, username_clean) where status = 'active'`
  );
  await pool.query(`
    create table if not exists ${TELEGRAM_VERIFICATIONS_TABLE} (
      id text primary key,
      telegram_username text not null,
      telegram_username_clean text not null,
      code text not null,
      message_text text,
      telegram_user_id text,
      telegram_chat_id text,
      created_at timestamptz not null
    )
  `);
  await pool.query(
    `create index if not exists ${TELEGRAM_VERIFICATIONS_TABLE}_lookup_idx on ${TELEGRAM_VERIFICATIONS_TABLE}(telegram_username_clean, code, created_at desc)`
  );
  await pool.query(`
    create table if not exists ${TELEGRAM_BOT_SESSIONS_TABLE} (
      id text primary key,
      telegram_user_id text not null,
      telegram_chat_id text not null,
      telegram_username text,
      telegram_first_name text,
      telegram_last_name text,
      state text not null,
      pending_handle text,
      pending_display_name text,
      last_prompt_message_id text,
      created_at timestamptz not null,
      updated_at timestamptz not null
    )
  `);
  await pool.query(
    `create unique index if not exists ${TELEGRAM_BOT_SESSIONS_TABLE}_user_chat_idx on ${TELEGRAM_BOT_SESSIONS_TABLE}(telegram_user_id, telegram_chat_id)`
  );
  await pool.query(
    `create index if not exists ${TELEGRAM_BOT_SESSIONS_TABLE}_updated_at_idx on ${TELEGRAM_BOT_SESSIONS_TABLE}(updated_at desc)`
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
  await pool.query(`
    create table if not exists ${MARKETPLACE_TRANSFERS_TABLE} (
      id text primary key,
      listing_id text not null,
      offer_id text not null,
      handle text not null,
      seller_user_id text not null,
      buyer_user_id text,
      buyer_name text not null,
      buyer_phone text not null,
      amount integer not null,
      status text not null,
      created_at timestamptz not null,
      updated_at timestamptz not null,
      reviewed_at timestamptz,
      transferred_at timestamptz,
      review_note text
    )
  `);
  await pool.query(
    `create index if not exists ${MARKETPLACE_TRANSFERS_TABLE}_listing_idx on ${MARKETPLACE_TRANSFERS_TABLE}(listing_id)`
  );
  await pool.query(
    `create index if not exists ${MARKETPLACE_TRANSFERS_TABLE}_status_idx on ${MARKETPLACE_TRANSFERS_TABLE}(status)`
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
    await countRows(client, NOTIFICATIONS_TABLE),
    await countRows(client, REFERRALS_TABLE),
    await countRows(client, OTPS_TABLE),
    await countRows(client, BANK_ACCOUNTS_TABLE),
    await countRows(client, CRYPTO_WALLETS_TABLE),
    await countRows(client, HANDLE_SOCIALS_TABLE),
    await countRows(client, TELEGRAM_VERIFICATIONS_TABLE),
    await countRows(client, TELEGRAM_BOT_SESSIONS_TABLE),
    await countRows(client, TRANSACTIONS_TABLE),
    await countRows(client, MARKETPLACE_LISTINGS_TABLE),
    await countRows(client, MARKETPLACE_OFFERS_TABLE),
    await countRows(client, MARKETPLACE_TRANSFERS_TABLE),
  ];

  return counts.some((count) => count > 0);
}

function normalizeData(data: Partial<AdminData> | null | undefined): AdminData {
  return {
    claims: Array.isArray(data?.claims) ? data.claims : [],
    apiLogs: Array.isArray(data?.apiLogs) ? data.apiLogs : [],
    notifications: Array.isArray(data?.notifications) ? data.notifications : [],
    users: Array.isArray(data?.users) ? data.users : [],
    referrals: Array.isArray(data?.referrals) ? data.referrals : [],
    otps: Array.isArray(data?.otps) ? data.otps : [],
    bankAccounts: Array.isArray(data?.bankAccounts) ? data.bankAccounts : [],
    cryptoWallets: Array.isArray(data?.cryptoWallets) ? data.cryptoWallets : [],
    handleSocials: Array.isArray(data?.handleSocials) ? data.handleSocials : [],
    telegramVerifications: Array.isArray(data?.telegramVerifications)
      ? data.telegramVerifications
      : [],
    telegramBotSessions: Array.isArray(data?.telegramBotSessions)
      ? data.telegramBotSessions
      : [],
    transactions: Array.isArray(data?.transactions) ? data.transactions : [],
    marketplaceListings: Array.isArray(data?.marketplaceListings)
      ? data.marketplaceListings
      : [],
    marketplaceOffers: Array.isArray(data?.marketplaceOffers)
      ? data.marketplaceOffers
      : [],
    marketplaceTransfers: Array.isArray(data?.marketplaceTransfers)
      ? data.marketplaceTransfers
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
      "points_balance",
      "welcome_rewarded_at",
      "privy_user_id",
      "privy_linked_at",
      "email",
      "wallet_address",
      "telegram_user_id",
      "telegram_chat_id",
      "telegram_username",
      "telegram_linked_at",
      "referral_code",
      "referred_by_user_id",
      "referred_at",
      "full_name",
      "avatar_url",
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
      user.pointsBalance ?? 0,
      user.welcomeRewardedAt ?? null,
      user.privyUserId ?? null,
      user.privyLinkedAt ?? null,
      user.email ?? null,
      user.walletAddress ?? null,
      user.telegramUserId ?? null,
      user.telegramChatId ?? null,
      user.telegramUsername ?? null,
      user.telegramLinkedAt ?? null,
      user.referralCode ?? null,
      user.referredByUserId ?? null,
      user.referredAt ?? null,
      user.fullName ?? null,
      user.avatarUrl ?? null,
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
    NOTIFICATIONS_TABLE,
    [
      "id",
      "user_id",
      "handle",
      "type",
      "title",
      "body",
      "priority",
      "status",
      "created_at",
      "read_at",
      "delivery_channels",
      "delivery_status",
      "delivery_attempts",
      "last_delivery_attempt_at",
      "delivered_at",
      "delivery_error",
      "metadata",
    ],
    data.notifications.map((notification) => [
      notification.id,
      notification.userId ?? null,
      notification.handle ?? null,
      notification.type,
      notification.title,
      notification.body,
      notification.priority,
      notification.status,
      notification.createdAt,
      notification.readAt ?? null,
      notification.deliveryChannels
        ? JSON.stringify(notification.deliveryChannels)
        : null,
      notification.deliveryStatus ?? null,
      notification.deliveryAttempts ?? 0,
      notification.lastDeliveryAttemptAt ?? null,
      notification.deliveredAt ?? null,
      notification.deliveryError ?? null,
      notification.metadata ?? null,
    ])
  );

  await replaceTable(
    client,
    REFERRALS_TABLE,
    [
      "id",
      "referrer_user_id",
      "referred_user_id",
      "referral_code",
      "source",
      "created_at",
      "converted_at",
      "signup_points",
      "conversion_points",
    ],
    data.referrals.map((referral) => [
      referral.id,
      referral.referrerUserId,
      referral.referredUserId,
      referral.referralCode,
      referral.source,
      referral.createdAt,
      referral.convertedAt ?? null,
      referral.signupPoints ?? 25,
      referral.conversionPoints ?? (referral.convertedAt ? 100 : 0),
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
    CRYPTO_WALLETS_TABLE,
    [
      "id",
      "user_id",
      "handle",
      "display_handle",
      "wallet_address",
      "chain",
      "is_default",
      "wallet_verified",
      "signature_hash",
      "nonce",
      "created_at",
      "updated_at",
    ],
    data.cryptoWallets.map((wallet) => [
      wallet.id,
      wallet.userId,
      wallet.handle,
      wallet.displayHandle,
      wallet.walletAddress,
      wallet.chain,
      wallet.isDefault,
      wallet.walletVerified,
      wallet.signatureHash,
      wallet.nonce,
      wallet.createdAt,
      wallet.updatedAt,
    ])
  );

  await replaceTable(
    client,
    HANDLE_SOCIALS_TABLE,
    [
      "id",
      "handle_id",
      "user_id",
      "handle",
      "platform",
      "username",
      "username_clean",
      "verified",
      "verified_at",
      "verification_code",
      "verification_expires_at",
      "ens_synced",
      "ens_synced_at",
      "ens_tx_hash",
      "status",
      "created_at",
      "updated_at",
    ],
    data.handleSocials.map((social) => [
      social.id,
      social.handleId,
      social.userId,
      social.handle,
      social.platform,
      social.username,
      social.usernameClean,
      social.verified,
      social.verifiedAt ?? null,
      social.verificationCode ?? null,
      social.verificationExpiresAt ?? null,
      social.ensSynced,
      social.ensSyncedAt ?? null,
      social.ensTxHash ?? null,
      social.status,
      social.createdAt,
      social.updatedAt,
    ])
  );

  await replaceTable(
    client,
    TELEGRAM_VERIFICATIONS_TABLE,
    [
      "id",
      "telegram_username",
      "telegram_username_clean",
      "code",
      "message_text",
      "telegram_user_id",
      "telegram_chat_id",
      "created_at",
    ],
    data.telegramVerifications.map((verification) => [
      verification.id,
      verification.telegramUsername,
      verification.telegramUsernameClean,
      verification.code,
      verification.messageText ?? null,
      verification.telegramUserId ?? null,
      verification.telegramChatId ?? null,
      verification.createdAt,
    ])
  );

  await replaceTable(
    client,
    TELEGRAM_BOT_SESSIONS_TABLE,
    [
      "id",
      "telegram_user_id",
      "telegram_chat_id",
      "telegram_username",
      "telegram_first_name",
      "telegram_last_name",
      "state",
      "pending_handle",
      "pending_display_name",
      "last_prompt_message_id",
      "created_at",
      "updated_at",
    ],
    data.telegramBotSessions.map((session) => [
      session.id,
      session.telegramUserId,
      session.telegramChatId,
      session.telegramUsername ?? null,
      session.telegramFirstName ?? null,
      session.telegramLastName ?? null,
      session.state,
      session.pendingHandle ?? null,
      session.pendingDisplayName ?? null,
      session.lastPromptMessageId ?? null,
      session.createdAt,
      session.updatedAt,
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

  await replaceTable(
    client,
    MARKETPLACE_TRANSFERS_TABLE,
    [
      "id",
      "listing_id",
      "offer_id",
      "handle",
      "seller_user_id",
      "buyer_user_id",
      "buyer_name",
      "buyer_phone",
      "amount",
      "status",
      "created_at",
      "updated_at",
      "reviewed_at",
      "transferred_at",
      "review_note",
    ],
    data.marketplaceTransfers.map((transfer) => [
      transfer.id,
      transfer.listingId,
      transfer.offerId,
      transfer.handle,
      transfer.sellerUserId,
      transfer.buyerUserId ?? null,
      transfer.buyerName,
      transfer.buyerPhone,
      transfer.amount,
      transfer.status,
      transfer.createdAt,
      transfer.updatedAt,
      transfer.reviewedAt ?? null,
      transfer.transferredAt ?? null,
      transfer.reviewNote ?? null,
    ])
  );
}

async function readLegacySnapshot(client: PoolClient): Promise<AdminData> {
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
    legacy.notifications.length > 0 ||
    legacy.referrals.length > 0 ||
    legacy.users.length > 0 ||
    legacy.otps.length > 0 ||
    legacy.bankAccounts.length > 0 ||
    legacy.cryptoWallets.length > 0 ||
    legacy.transactions.length > 0 ||
    legacy.marketplaceListings.length > 0 ||
    legacy.marketplaceOffers.length > 0 ||
    legacy.marketplaceTransfers.length > 0;

  if (!hasLegacyData) return;

  await replaceSnapshot(client, legacy);
}

function mapRowsToSnapshot(rows: {
  users: Array<{
    id: string;
    phone: string;
    created_at: string;
    phone_verified_at: string;
    points_balance: number | null;
    welcome_rewarded_at: string | null;
    privy_user_id: string | null;
    privy_linked_at: string | null;
    email: string | null;
    wallet_address: string | null;
    telegram_user_id: string | null;
    telegram_chat_id: string | null;
    telegram_username: string | null;
    telegram_linked_at: string | null;
    referral_code: string | null;
    referred_by_user_id: string | null;
    referred_at: string | null;
    full_name: string | null;
    avatar_url: string | null;
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
    source: "web" | "api" | "telegram";
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
  notifications?: Array<{
    id: string;
    user_id: string | null;
    handle: string | null;
    type: AdminData["notifications"][number]["type"];
    title: string;
    body: string;
    priority: AdminData["notifications"][number]["priority"];
    status: AdminData["notifications"][number]["status"];
    created_at: string;
    read_at: string | null;
    delivery_channels: AdminData["notifications"][number]["deliveryChannels"] | null;
    delivery_status: AdminData["notifications"][number]["deliveryStatus"] | null;
    delivery_attempts: number | null;
    last_delivery_attempt_at: string | null;
    delivered_at: string | null;
    delivery_error: string | null;
    metadata: AdminData["notifications"][number]["metadata"] | null;
  }>;
  referrals: Array<{
    id: string;
    referrer_user_id: string;
    referred_user_id: string;
    referral_code: string;
    source: AdminData["referrals"][number]["source"];
    created_at: string;
    converted_at: string | null;
    signup_points: number | null;
    conversion_points: number | null;
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
  cryptoWallets: Array<{
    id: string;
    user_id: string;
    handle: string;
    display_handle: string;
    wallet_address: string;
    chain: AdminData["cryptoWallets"][number]["chain"];
    is_default: boolean;
    wallet_verified: boolean;
    signature_hash: string;
    nonce: string;
    created_at: string;
    updated_at: string;
  }>;
  handleSocials: Array<{
    id: string;
    handle_id: string;
    user_id: string;
    handle: string;
    platform: AdminData["handleSocials"][number]["platform"];
    username: string;
    username_clean: string;
    verified: boolean;
    verified_at: string | null;
    verification_code: string | null;
    verification_expires_at: string | null;
    ens_synced: boolean;
    ens_synced_at: string | null;
    ens_tx_hash: string | null;
    status: AdminData["handleSocials"][number]["status"];
    created_at: string;
    updated_at: string;
  }>;
  telegramVerifications: Array<{
    id: string;
    telegram_username: string;
    telegram_username_clean: string;
    code: string;
    message_text: string | null;
    telegram_user_id: string | null;
    telegram_chat_id: string | null;
    created_at: string;
  }>;
  telegramBotSessions: Array<{
    id: string;
    telegram_user_id: string;
    telegram_chat_id: string;
    telegram_username: string | null;
    telegram_first_name: string | null;
    telegram_last_name: string | null;
    state: AdminData["telegramBotSessions"][number]["state"];
    pending_handle: string | null;
    pending_display_name: string | null;
    last_prompt_message_id: string | null;
    created_at: string;
    updated_at: string;
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
  marketplaceTransfers: Array<{
    id: string;
    listing_id: string;
    offer_id: string;
    handle: string;
    seller_user_id: string;
    buyer_user_id: string | null;
    buyer_name: string;
    buyer_phone: string;
    amount: number;
    status: AdminData["marketplaceTransfers"][number]["status"];
    created_at: string;
    updated_at: string;
    reviewed_at: string | null;
    transferred_at: string | null;
    review_note: string | null;
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
      pointsBalance:
        typeof user.points_balance === "number" && user.points_balance > 0
          ? user.points_balance
          : 0,
      welcomeRewardedAt: toIso(user.welcome_rewarded_at),
      privyUserId: user.privy_user_id ?? undefined,
      privyLinkedAt: toIso(user.privy_linked_at),
      email: user.email ?? undefined,
      walletAddress: user.wallet_address ?? undefined,
      telegramUserId: user.telegram_user_id ?? undefined,
      telegramChatId: user.telegram_chat_id ?? undefined,
      telegramUsername: user.telegram_username ?? undefined,
      telegramLinkedAt: toIso(user.telegram_linked_at),
      referralCode: user.referral_code ?? undefined,
      referredByUserId: user.referred_by_user_id ?? undefined,
      referredAt: toIso(user.referred_at),
      fullName: user.full_name ?? undefined,
      avatarUrl: user.avatar_url ?? undefined,
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
    notifications: (rows.notifications ?? []).map((notification) => ({
      id: notification.id,
      userId: notification.user_id ?? undefined,
      handle: notification.handle ?? undefined,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      priority: notification.priority,
      status: notification.status,
      createdAt: toIso(notification.created_at) ?? new Date().toISOString(),
      readAt: toIso(notification.read_at),
      deliveryChannels: notification.delivery_channels ?? undefined,
      deliveryStatus: notification.delivery_status ?? undefined,
      deliveryAttempts: notification.delivery_attempts ?? undefined,
      lastDeliveryAttemptAt: toIso(notification.last_delivery_attempt_at),
      deliveredAt: toIso(notification.delivered_at),
      deliveryError: notification.delivery_error ?? undefined,
      metadata: notification.metadata ?? undefined,
    })),
    referrals: rows.referrals.map((referral) => ({
      id: referral.id,
      referrerUserId: referral.referrer_user_id,
      referredUserId: referral.referred_user_id,
      referralCode: referral.referral_code,
      source: referral.source,
      createdAt: toIso(referral.created_at) ?? new Date().toISOString(),
      convertedAt: toIso(referral.converted_at),
      signupPoints:
        typeof referral.signup_points === "number" && referral.signup_points > 0
          ? referral.signup_points
          : 25,
      conversionPoints:
        typeof referral.conversion_points === "number" &&
        referral.conversion_points > 0
          ? referral.conversion_points
          : referral.converted_at
            ? 100
            : 0,
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
    cryptoWallets: rows.cryptoWallets.map((wallet) => ({
      id: wallet.id,
      userId: wallet.user_id,
      handle: wallet.handle,
      displayHandle: wallet.display_handle,
      walletAddress: wallet.wallet_address,
      chain: wallet.chain,
      isDefault: wallet.is_default,
      walletVerified: wallet.wallet_verified,
      signatureHash: wallet.signature_hash,
      nonce: wallet.nonce,
      createdAt: toIso(wallet.created_at) ?? new Date().toISOString(),
      updatedAt: toIso(wallet.updated_at) ?? new Date().toISOString(),
    })),
    handleSocials: rows.handleSocials.map((social) => ({
      id: social.id,
      handleId: social.handle_id,
      userId: social.user_id,
      handle: social.handle,
      platform: social.platform,
      username: social.username,
      usernameClean: social.username_clean,
      verified: social.verified,
      verifiedAt: toIso(social.verified_at),
      verificationCode: social.verification_code ?? undefined,
      verificationExpiresAt: toIso(social.verification_expires_at),
      ensSynced: social.ens_synced,
      ensSyncedAt: toIso(social.ens_synced_at),
      ensTxHash: social.ens_tx_hash ?? undefined,
      status: social.status,
      createdAt: toIso(social.created_at) ?? new Date().toISOString(),
      updatedAt: toIso(social.updated_at) ?? new Date().toISOString(),
    })),
    telegramVerifications: rows.telegramVerifications.map((verification) => ({
      id: verification.id,
      telegramUsername: verification.telegram_username,
      telegramUsernameClean: verification.telegram_username_clean,
      code: verification.code,
      messageText: verification.message_text ?? undefined,
      telegramUserId: verification.telegram_user_id ?? undefined,
      telegramChatId: verification.telegram_chat_id ?? undefined,
      createdAt: toIso(verification.created_at) ?? new Date().toISOString(),
    })),
    telegramBotSessions: rows.telegramBotSessions.map((session) => ({
      id: session.id,
      telegramUserId: session.telegram_user_id,
      telegramChatId: session.telegram_chat_id,
      telegramUsername: session.telegram_username ?? undefined,
      telegramFirstName: session.telegram_first_name ?? undefined,
      telegramLastName: session.telegram_last_name ?? undefined,
      state: session.state,
      pendingHandle: session.pending_handle ?? undefined,
      pendingDisplayName: session.pending_display_name ?? undefined,
      lastPromptMessageId: session.last_prompt_message_id ?? undefined,
      createdAt: toIso(session.created_at) ?? new Date().toISOString(),
      updatedAt: toIso(session.updated_at) ?? new Date().toISOString(),
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
    marketplaceTransfers: rows.marketplaceTransfers.map((transfer) => ({
      id: transfer.id,
      listingId: transfer.listing_id,
      offerId: transfer.offer_id,
      handle: transfer.handle,
      sellerUserId: transfer.seller_user_id,
      buyerUserId: transfer.buyer_user_id ?? undefined,
      buyerName: transfer.buyer_name,
      buyerPhone: transfer.buyer_phone,
      amount: transfer.amount,
      status: transfer.status,
      createdAt: toIso(transfer.created_at) ?? new Date().toISOString(),
      updatedAt: toIso(transfer.updated_at) ?? new Date().toISOString(),
      reviewedAt: toIso(transfer.reviewed_at),
      transferredAt: toIso(transfer.transferred_at),
      reviewNote: transfer.review_note ?? undefined,
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
      points_balance: number | null;
      welcome_rewarded_at: string | null;
      privy_user_id: string | null;
      privy_linked_at: string | null;
      email: string | null;
      wallet_address: string | null;
      telegram_user_id: string | null;
      telegram_chat_id: string | null;
      telegram_username: string | null;
      telegram_linked_at: string | null;
      referral_code: string | null;
      referred_by_user_id: string | null;
      referred_at: string | null;
      full_name: string | null;
      avatar_url: string | null;
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
      source: "web" | "api" | "telegram";
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
    const notifications = await client.query<{
      id: string;
      user_id: string | null;
      handle: string | null;
      type: AdminData["notifications"][number]["type"];
      title: string;
      body: string;
      priority: AdminData["notifications"][number]["priority"];
      status: AdminData["notifications"][number]["status"];
      created_at: string;
      read_at: string | null;
      delivery_channels: AdminData["notifications"][number]["deliveryChannels"] | null;
      delivery_status: AdminData["notifications"][number]["deliveryStatus"] | null;
      delivery_attempts: number | null;
      last_delivery_attempt_at: string | null;
      delivered_at: string | null;
      delivery_error: string | null;
      metadata: AdminData["notifications"][number]["metadata"] | null;
    }>(`select * from ${NOTIFICATIONS_TABLE} order by created_at desc`);
    const referrals = await client.query<{
      id: string;
      referrer_user_id: string;
      referred_user_id: string;
      referral_code: string;
      source: AdminData["referrals"][number]["source"];
      created_at: string;
      converted_at: string | null;
      signup_points: number | null;
      conversion_points: number | null;
    }>(`select * from ${REFERRALS_TABLE} order by created_at desc`);
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
    const cryptoWallets = await client.query<{
      id: string;
      user_id: string;
      handle: string;
      display_handle: string;
      wallet_address: string;
      chain: AdminData["cryptoWallets"][number]["chain"];
      is_default: boolean;
      wallet_verified: boolean;
      signature_hash: string;
      nonce: string;
      created_at: string;
      updated_at: string;
    }>(`select * from ${CRYPTO_WALLETS_TABLE} order by updated_at desc`);
    const handleSocials = await client.query<{
      id: string;
      handle_id: string;
      user_id: string;
      handle: string;
      platform: AdminData["handleSocials"][number]["platform"];
      username: string;
      username_clean: string;
      verified: boolean;
      verified_at: string | null;
      verification_code: string | null;
      verification_expires_at: string | null;
      ens_synced: boolean;
      ens_synced_at: string | null;
      ens_tx_hash: string | null;
      status: AdminData["handleSocials"][number]["status"];
      created_at: string;
      updated_at: string;
    }>(`select * from ${HANDLE_SOCIALS_TABLE} order by updated_at desc`);
    const telegramVerifications = await client.query<{
      id: string;
      telegram_username: string;
      telegram_username_clean: string;
      code: string;
      message_text: string | null;
      telegram_user_id: string | null;
      telegram_chat_id: string | null;
      created_at: string;
    }>(`select * from ${TELEGRAM_VERIFICATIONS_TABLE} order by created_at desc`);
    const telegramBotSessions = await client.query<{
      id: string;
      telegram_user_id: string;
      telegram_chat_id: string;
      telegram_username: string | null;
      telegram_first_name: string | null;
      telegram_last_name: string | null;
      state: AdminData["telegramBotSessions"][number]["state"];
      pending_handle: string | null;
      pending_display_name: string | null;
      last_prompt_message_id: string | null;
      created_at: string;
      updated_at: string;
    }>(`select * from ${TELEGRAM_BOT_SESSIONS_TABLE} order by updated_at desc`);
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
    const marketplaceTransfers = await client.query<{
      id: string;
      listing_id: string;
      offer_id: string;
      handle: string;
      seller_user_id: string;
      buyer_user_id: string | null;
      buyer_name: string;
      buyer_phone: string;
      amount: number;
      status: AdminData["marketplaceTransfers"][number]["status"];
      created_at: string;
      updated_at: string;
      reviewed_at: string | null;
      transferred_at: string | null;
      review_note: string | null;
    }>(`select * from ${MARKETPLACE_TRANSFERS_TABLE} order by created_at desc`);

    return mapRowsToSnapshot({
      users: users.rows,
      claims: claims.rows,
      apiLogs: apiLogs.rows,
      notifications: notifications.rows,
      referrals: referrals.rows,
      otps: otps.rows,
      bankAccounts: bankAccounts.rows,
      cryptoWallets: cryptoWallets.rows,
      handleSocials: handleSocials.rows,
      telegramVerifications: telegramVerifications.rows,
      telegramBotSessions: telegramBotSessions.rows,
      transactions: transactions.rows,
      marketplaceListings: marketplaceListings.rows,
      marketplaceOffers: marketplaceOffers.rows,
      marketplaceTransfers: marketplaceTransfers.rows,
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
