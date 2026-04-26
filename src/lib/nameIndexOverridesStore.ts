import crypto from "crypto";
import { promises as fs } from "fs";
import path from "path";

import { Pool } from "pg";

import {
  type NameCategory,
  type NameIndexCurrency,
  type NameIndexOverrideRecord,
  buildDefaultRecord,
  isValidHandle,
  mergeNameIndexRecord,
  normalizeHandle,
} from "./nameIndex";

const DATA_FILE = path.join(process.cwd(), "data", "name-index-overrides.json");
const TABLE_NAME = "nt_name_index_overrides";

declare global {
  var __nairatagNameIndexPool: Pool | undefined;
}

export type NameIndexOverrideInput = {
  handle: string;
  category: NameCategory;
  badge?: string | null;
  price?: number | null;
  currency?: NameIndexCurrency | null;
  claimable?: boolean;
  purchasable?: boolean;
  requestable?: boolean;
  reason?: string | null;
  metadata?: Record<string, unknown>;
  owner_type?: string | null;
  actor?: string | null;
};

let queue: Promise<unknown> = Promise.resolve();

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

function databaseUrl() {
  return process.env.DATABASE_URL?.trim() || "";
}

function canUseDatabase() {
  return Boolean(databaseUrl());
}

function getPool() {
  if (!canUseDatabase()) return null;
  if (!global.__nairatagNameIndexPool) {
    global.__nairatagNameIndexPool = new Pool({
      connectionString: databaseUrl(),
      ssl: { rejectUnauthorized: false },
      max: 2,
      connectionTimeoutMillis: 2500,
      idleTimeoutMillis: 10000,
      query_timeout: 5000,
      statement_timeout: 5000,
    });
  }

  return global.__nairatagNameIndexPool;
}

async function ensureSchema() {
  const pool = getPool();
  if (!pool) return;

  await pool.query(`
    create table if not exists ${TABLE_NAME} (
      id text primary key,
      handle text not null unique,
      category text not null,
      badge text,
      price integer,
      currency text,
      claimable boolean not null,
      purchasable boolean not null,
      requestable boolean not null,
      reason text,
      metadata jsonb,
      owner_type text,
      created_at timestamptz not null,
      updated_at timestamptz not null,
      created_by text,
      updated_by text
    )
  `);
  await pool.query(
    `create index if not exists ${TABLE_NAME}_category_idx on ${TABLE_NAME}(category)`
  );
  await pool.query(
    `create index if not exists ${TABLE_NAME}_updated_at_idx on ${TABLE_NAME}(updated_at desc)`
  );
}

async function ensureDataFile() {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, "[]", "utf8");
  }
}

function defaultsForCategory(category: NameCategory) {
  if (category === "premium") {
    return {
      claimable: false,
      purchasable: true,
      requestable: false,
    };
  }

  if (category === "protected") {
    return {
      claimable: false,
      purchasable: false,
      requestable: true,
    };
  }

  if (category === "blocked") {
    return {
      claimable: false,
      purchasable: false,
      requestable: false,
    };
  }

  return {
    claimable: true,
    purchasable: false,
    requestable: false,
  };
}

function normalizePrice(value: number | null | undefined) {
  if (value === null || value === undefined || value === 0) return null;
  if (!Number.isFinite(value) || value < 0) throw new Error("invalid_price");
  return Math.round(value);
}

function sanitizeOverrideInput(input: NameIndexOverrideInput) {
  const handle = normalizeHandle(input.handle);
  if (!handle || !isValidHandle(handle)) {
    throw new Error("invalid_handle");
  }

  const fallback = defaultsForCategory(input.category);
  const merged = mergeNameIndexRecord(buildDefaultRecord(handle), {
    handle,
    category: input.category,
    badge: input.badge?.trim() || null,
    price: normalizePrice(input.price),
    currency: input.currency ?? null,
    claimable:
      typeof input.claimable === "boolean" ? input.claimable : fallback.claimable,
    purchasable:
      typeof input.purchasable === "boolean"
        ? input.purchasable
        : fallback.purchasable,
    requestable:
      typeof input.requestable === "boolean"
        ? input.requestable
        : fallback.requestable,
    reason: input.reason?.trim() || null,
    metadata: input.metadata ?? {},
    owner_type: input.owner_type?.trim() || null,
  });

  return {
    ...merged,
    handle,
    actor: input.actor?.trim() || null,
  };
}

function normalizeOverrideRecord(
  record: Partial<NameIndexOverrideRecord> | null | undefined
): NameIndexOverrideRecord | null {
  if (!record?.handle || !record?.id || !record?.createdAt || !record?.updatedAt) {
    return null;
  }

  const merged = mergeNameIndexRecord(buildDefaultRecord(record.handle), record);
  return {
    ...merged,
    id: record.id,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    createdBy: record.createdBy ?? null,
    updatedBy: record.updatedBy ?? null,
  };
}

async function readFileOverridesUnsafe() {
  await ensureDataFile();
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as Array<Partial<NameIndexOverrideRecord>>;
    return parsed
      .map((record) => normalizeOverrideRecord(record))
      .filter((record): record is NameIndexOverrideRecord => Boolean(record));
  } catch {
    await fs.writeFile(DATA_FILE, "[]", "utf8");
    return [] as NameIndexOverrideRecord[];
  }
}

async function writeFileOverridesUnsafe(records: NameIndexOverrideRecord[]) {
  await ensureDataFile();
  await fs.writeFile(DATA_FILE, JSON.stringify(records, null, 2), "utf8");
}

async function readDatabaseOverridesUnsafe() {
  const pool = getPool();
  if (!pool) return null;
  await ensureSchema();

  const result = await pool.query<{
    id: string;
    handle: string;
    category: NameCategory;
    badge: string | null;
    price: number | null;
    currency: NameIndexCurrency | null;
    claimable: boolean;
    purchasable: boolean;
    requestable: boolean;
    reason: string | null;
    metadata: Record<string, unknown> | null;
    owner_type: string | null;
    created_at: string;
    updated_at: string;
    created_by: string | null;
    updated_by: string | null;
  }>(`select * from ${TABLE_NAME} order by updated_at desc`);

  return result.rows.map((row) => ({
    id: row.id,
    handle: row.handle,
    category: row.category,
    badge: row.badge,
    price: row.price,
    currency: row.currency,
    claimable: row.claimable,
    purchasable: row.purchasable,
    requestable: row.requestable,
    reason: row.reason,
    metadata: row.metadata ?? {},
    owner_type: row.owner_type,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
  }));
}

async function writeDatabaseOverrideUnsafe(record: NameIndexOverrideRecord) {
  const pool = getPool();
  if (!pool) return false;
  await ensureSchema();

  await pool.query(
    `
      insert into ${TABLE_NAME} (
        id, handle, category, badge, price, currency, claimable, purchasable,
        requestable, reason, metadata, owner_type, created_at, updated_at,
        created_by, updated_by
      ) values (
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9, $10, $11::jsonb, $12, $13, $14,
        $15, $16
      )
      on conflict (handle) do update set
        category = excluded.category,
        badge = excluded.badge,
        price = excluded.price,
        currency = excluded.currency,
        claimable = excluded.claimable,
        purchasable = excluded.purchasable,
        requestable = excluded.requestable,
        reason = excluded.reason,
        metadata = excluded.metadata,
        owner_type = excluded.owner_type,
        updated_at = excluded.updated_at,
        updated_by = excluded.updated_by
    `,
    [
      record.id,
      record.handle,
      record.category,
      record.badge ?? null,
      record.price ?? null,
      record.currency ?? null,
      record.claimable,
      record.purchasable,
      record.requestable,
      record.reason ?? null,
      JSON.stringify(record.metadata ?? {}),
      record.owner_type ?? null,
      record.createdAt,
      record.updatedAt,
      record.createdBy ?? null,
      record.updatedBy ?? null,
    ]
  );

  return true;
}

async function deleteDatabaseOverrideUnsafe(handle: string) {
  const pool = getPool();
  if (!pool) return false;
  await ensureSchema();
  await pool.query(`delete from ${TABLE_NAME} where handle = $1`, [handle]);
  return true;
}

async function readOverridesUnsafe() {
  const fromDb = await readDatabaseOverridesUnsafe();
  if (fromDb) {
    return fromDb;
  }

  return readFileOverridesUnsafe();
}

export async function listNameIndexOverrides() {
  return enqueue(readOverridesUnsafe);
}

export async function getNameIndexOverridesMap() {
  const records = await listNameIndexOverrides();
  return new Map(records.map((record) => [record.handle, record] as const));
}

export async function upsertNameIndexOverride(input: NameIndexOverrideInput) {
  return enqueue(async () => {
    const sanitized = sanitizeOverrideInput(input);
    const existing = (await readOverridesUnsafe()).find(
      (record) => record.handle === sanitized.handle
    );
    const now = new Date().toISOString();
    const record: NameIndexOverrideRecord = {
      ...sanitized,
      id: existing?.id ?? `nameidx_${crypto.randomUUID()}`,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      createdBy: existing?.createdBy ?? sanitized.actor,
      updatedBy: sanitized.actor,
    };

    const wroteToDb = await writeDatabaseOverrideUnsafe(record);
    if (!wroteToDb) {
      const all = await readFileOverridesUnsafe();
      const next = all.filter((entry) => entry.handle !== record.handle);
      next.unshift(record);
      await writeFileOverridesUnsafe(next);
    }

    return record;
  });
}

export async function deleteNameIndexOverride(handleInput: string) {
  return enqueue(async () => {
    const handle = normalizeHandle(handleInput);
    if (!handle) return false;

    const deletedFromDb = await deleteDatabaseOverrideUnsafe(handle);
    if (!deletedFromDb) {
      const all = await readFileOverridesUnsafe();
      const next = all.filter((entry) => entry.handle !== handle);
      await writeFileOverridesUnsafe(next);
    }

    return true;
  });
}
