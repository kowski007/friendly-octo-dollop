import { NextResponse, type NextRequest } from "next/server";

import { resetAdminNameIndexOverride, saveAdminNameIndexOverride } from "@/lib/adminStore";
import type { NameCategory, NameIndexCurrency } from "@/lib/nameIndex";

type Body = {
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
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ handle: string }> }
) {
  const { handle } = await params;
  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body?.category) {
    return NextResponse.json({ error: "category is required" }, { status: 400 });
  }

  try {
    const result = await saveAdminNameIndexOverride({
      handle,
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
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update override";
    const status = message === "invalid_handle" || message === "invalid_price" ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ handle: string }> }
) {
  const { handle } = await params;
  try {
    const result = await resetAdminNameIndexOverride(handle);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to reset override";
    const status = message === "invalid_handle" ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
