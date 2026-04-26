import { NextResponse, type NextRequest } from "next/server";

import { listAdminNameIndexEntries, saveAdminNameIndexOverride } from "@/lib/adminStore";
import type { NameCategory, NameIndexCurrency } from "@/lib/nameIndex";

function toInt(value: string | null, fallback: number) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function GET(req: NextRequest) {
  const limit = Math.min(
    100,
    Math.max(1, toInt(req.nextUrl.searchParams.get("limit"), 25))
  );
  const offset = Math.max(0, toInt(req.nextUrl.searchParams.get("offset"), 0));
  const q = req.nextUrl.searchParams.get("q") ?? undefined;
  const category =
    (req.nextUrl.searchParams.get("category") as NameCategory | "all" | null) ??
    "all";
  const status =
    (req.nextUrl.searchParams.get("status") as
      | "all"
      | "available"
      | "premium"
      | "protected"
      | "blocked"
      | "taken"
      | "invalid"
      | "listed"
      | "unlisted"
      | null) ?? "all";
  const source =
    (req.nextUrl.searchParams.get("source") as "all" | "seed" | "override" | null) ??
    "all";

  const data = await listAdminNameIndexEntries({
    limit,
    offset,
    q,
    category,
    status,
    source,
  });

  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as
    | {
        handle?: string;
        category?: NameCategory;
        badge?: string | null;
        price?: number | null;
        currency?: NameIndexCurrency | null;
        claimable?: boolean;
        purchasable?: boolean;
        requestable?: boolean;
        reason?: string | null;
        owner_type?: string | null;
        metadata?: Record<string, unknown>;
        actor?: string | null;
      }
    | null;

  if (!body?.handle || !body.category) {
    return NextResponse.json(
      { error: "handle and category are required" },
      { status: 400 }
    );
  }

  try {
    const result = await saveAdminNameIndexOverride({
      handle: body.handle,
      category: body.category,
      badge: body.badge,
      price: body.price,
      currency: body.currency,
      claimable: body.claimable,
      purchasable: body.purchasable,
      requestable: body.requestable,
      reason: body.reason,
      owner_type: body.owner_type,
      metadata: body.metadata,
      actor: body.actor,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save override";
    const status = message === "invalid_handle" || message === "invalid_price" ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
