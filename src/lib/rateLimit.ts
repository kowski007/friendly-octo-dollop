import crypto from "crypto";
import { Pool } from "pg";
import type { NextRequest } from "next/server";

declare global {
  var __nairatagRateLimitPool: Pool | undefined;
}

type ConsumeRateLimitInput = {
  scope: string;
  identifier: string;
  limit: number;
  windowMs: number;
};

type ConsumeRateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
  resetAt: string;
};

const TABLE = "nt_rate_limits";

function databaseUrl() {
  return process.env.DATABASE_URL?.trim() || "";
}

function getPool() {
  const url = databaseUrl();
  if (!url) throw new Error("database_not_configured");
  if (!global.__nairatagRateLimitPool) {
    global.__nairatagRateLimitPool = new Pool({
      connectionString: url,
      ssl: { rejectUnauthorized: false },
      max: 3,
      connectionTimeoutMillis: 2500,
      idleTimeoutMillis: 10000,
      query_timeout: 7000,
      statement_timeout: 7000,
    });
  }
  return global.__nairatagRateLimitPool;
}

async function ensureSchema(pool: Pool) {
  await pool.query(`
    create table if not exists ${TABLE} (
      bucket_key text primary key,
      scope text not null,
      identifier_hash text not null,
      hit_count integer not null default 0,
      window_started_at timestamptz not null,
      expires_at timestamptz not null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `);

  await pool.query(
    `create index if not exists ${TABLE}_expires_idx on ${TABLE}(expires_at)`
  );
}

function hashIdentifier(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function bucketKey(scope: string, identifier: string, windowStartedAt: number, windowMs: number) {
  return `${scope}:${hashIdentifier(identifier)}:${Math.floor(windowStartedAt / windowMs)}`;
}

export function getClientAddress(req: NextRequest) {
  const forwarded = req.headers.get("x-forwarded-for") || "";
  const first = forwarded
    .split(",")
    .map((part) => part.trim())
    .find(Boolean);
  return first || req.headers.get("x-real-ip")?.trim() || "unknown";
}

export async function consumeRateLimit(
  input: ConsumeRateLimitInput
): Promise<ConsumeRateLimitResult> {
  const pool = getPool();
  await ensureSchema(pool);

  const now = Date.now();
  const windowStartedAt = now - (now % input.windowMs);
  const expiresAt = new Date(windowStartedAt + input.windowMs).toISOString();
  const startedAtIso = new Date(windowStartedAt).toISOString();
  const key = bucketKey(
    input.scope,
    input.identifier,
    windowStartedAt,
    input.windowMs
  );
  const client = await pool.connect();

  try {
    await client.query("begin");
    await client.query(`delete from ${TABLE} where expires_at <= now()`);

    const current = await client.query<{
      bucket_key: string;
      hit_count: number;
      expires_at: string;
    }>(
      `select bucket_key, hit_count, expires_at from ${TABLE} where bucket_key = $1 for update`,
      [key]
    );

    if (!current.rows[0]) {
      await client.query(
        `
          insert into ${TABLE} (
            bucket_key, scope, identifier_hash, hit_count,
            window_started_at, expires_at, updated_at
          ) values ($1,$2,$3,1,$4,$5,$6)
        `,
        [
          key,
          input.scope,
          hashIdentifier(input.identifier),
          startedAtIso,
          expiresAt,
          new Date(now).toISOString(),
        ]
      );
      await client.query("commit");
      return {
        allowed: true,
        remaining: Math.max(0, input.limit - 1),
        retryAfterSec: Math.max(1, Math.ceil((windowStartedAt + input.windowMs - now) / 1000)),
        resetAt: expiresAt,
      };
    }

    const count = Number(current.rows[0].hit_count) || 0;
    if (count >= input.limit) {
      await client.query("commit");
      return {
        allowed: false,
        remaining: 0,
        retryAfterSec: Math.max(
          1,
          Math.ceil((new Date(current.rows[0].expires_at).getTime() - now) / 1000)
        ),
        resetAt: new Date(current.rows[0].expires_at).toISOString(),
      };
    }

    const nextCount = count + 1;
    await client.query(
      `
        update ${TABLE}
        set hit_count = $2,
            updated_at = $3
        where bucket_key = $1
      `,
      [key, nextCount, new Date(now).toISOString()]
    );
    await client.query("commit");

    return {
      allowed: true,
      remaining: Math.max(0, input.limit - nextCount),
      retryAfterSec: Math.max(
        1,
        Math.ceil((new Date(current.rows[0].expires_at).getTime() - now) / 1000)
      ),
      resetAt: new Date(current.rows[0].expires_at).toISOString(),
    };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

