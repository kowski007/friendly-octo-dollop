import { NextResponse, type NextRequest } from "next/server";

import { reviewMarketplaceTransfer } from "@/lib/adminStore";

type Context = {
  params: Promise<{ transferId: string }>;
};

export async function PATCH(req: NextRequest, { params }: Context) {
  let status = 200;

  try {
    const { transferId } = await params;
    const body = (await req.json().catch(() => null)) as
      | {
          action?: "approve" | "reject";
          reviewNote?: string;
        }
      | null;
    const action = body?.action;

    if (!action || !["approve", "reject"].includes(action)) {
      throw new Error("invalid_transfer_action");
    }

    const transfer = await reviewMarketplaceTransfer({
      transferId,
      action,
      reviewNote: body?.reviewNote,
    });

    return NextResponse.json(
      { ok: true, transfer },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    status =
      message === "invalid_transfer_action"
        ? 400
        : message === "transfer_not_found" ||
            message === "listing_not_found" ||
            message === "offer_not_found" ||
            message === "claim_not_found"
          ? 404
          : message === "transfer_not_pending" ||
              message === "seller_ownership_mismatch" ||
              message === "offer_listing_mismatch" ||
              message === "buyer_verification_required" ||
              message === "buyer_bank_link_required" ||
              message === "buyer_already_has_handle"
            ? 409
            : 500;

    return NextResponse.json(
      { error: message },
      { status, headers: { "Cache-Control": "no-store" } }
    );
  }
}
