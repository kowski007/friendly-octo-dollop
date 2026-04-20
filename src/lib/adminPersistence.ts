import { Pool, type PoolClient } from "pg";

import type { AdminData } from "./adminStore";

const LEGACY_TABLE = "nairatag_admin_state";
const USERS_TABLE = "nt_phase0_users";
const HANDLES_TABLE = "nt_phase0_handles";
const API_LOGS_TABLE = "nt_phase0_api_logs";
const OTPS_TABLE = "nt_phase0_otps";
const BANK_ACCOUNTS_TABLE = "nt_phase0_bank_accounts";

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
    legacy.otps.length > 0;

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

    return mapRowsToSnapshot({
      users: users.rows,
      claims: claims.rows,
      apiLogs: apiLogs.rows,
      otps: otps.rows,
      bankAccounts: bankAccounts.rows,
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
