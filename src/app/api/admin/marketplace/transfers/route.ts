import { NextResponse, type NextRequest } from "next/server";

import { listMarketplaceTransfers } from "@/lib/adminStore";
import type { MarketplaceTransferStatus } from "@/lib/adminTypes";

const TRANSFER_STATUSES = new Set<MarketplaceTransferStatus>([
  "pending_review",
  "approved",
  "rejected",
]);

function toInt(value: string | null, fallback: number) {
  if (!value) return fallback;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

function parseStatus(value: string | null) {
  if (!value) return undefined;
  if (!TRANSFER_STATUSES.has(value as MarketplaceTransferStatus)) return undefined;
  return value as MarketplaceTransferStatus;
}

export async function GET(req: NextRequest) {
  const limit = Math.min(
    100,
    Math.max(1, toInt(req.nextUrl.searchParams.get("limit"), 25))
  );
  const offset = Math.max(0, toInt(req.nextUrl.searchParams.get("offset"), 0));
  const status = parseStatus(req.nextUrl.searchParams.get("status"));
  const data = await listMarketplaceTransfers({ limit, offset, status });

  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}
