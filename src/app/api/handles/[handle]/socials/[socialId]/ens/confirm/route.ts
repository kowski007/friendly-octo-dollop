import { NextRequest, NextResponse } from "next/server";

import { logApiUsage, normalizeHandle } from "@/lib/adminStore";
import { confirmTelegramEnsTextSync } from "@/lib/ensSync";
import { verifySessionToken } from "@/lib/session";

type RouteContext = {
  params: Promise<{ handle: string; socialId: string }>;
};

function statusForError(message: string) {
  switch (message) {
    case "missing_handle":
    case "invalid_handle":
    case "invalid_transaction_hash":
      return 400;
    case "social_not_found":
      return 404;
    case "handle_not_owned":
    case "ens_transaction_sender_mismatch":
    case "ens_transaction_target_mismatch":
      return 403;
    case "ens_parent_not_configured":
    case "telegram_not_verified":
    case "wallet_required":
    case "ens_name_missing":
    case "ens_resolver_missing":
    case "ens_text_not_supported":
    case "ens_text_mismatch":
    case "ens_transaction_failed":
      return 409;
    default:
      return 500;
  }
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const started = Date.now();
  const clientKey = req.headers.get("x-nt-api-key") ?? undefined;
  let status = 200;

  try {
    const token = req.cookies.get("nt_session")?.value || "";
    const payload = token ? verifySessionToken(token) : null;
    const { handle, socialId } = await params;
    const normalizedHandle = normalizeHandle(handle);
    const body = (await req.json().catch(() => null)) as { txHash?: string } | null;

    if (!payload) {
      status = 401;
      return NextResponse.json({ error: "unauthorized" }, { status });
    }
    if (!normalizedHandle) {
      status = 400;
      return NextResponse.json({ error: "missing_handle" }, { status });
    }
    if (!body?.txHash?.trim()) {
      status = 400;
      return NextResponse.json({ error: "invalid_transaction_hash" }, { status });
    }

    const confirmed = await confirmTelegramEnsTextSync({
      userId: payload.uid,
      handle: normalizedHandle,
      socialId,
      txHash: body.txHash,
    });

    status = 200;
    return NextResponse.json(
      { ok: true, ...confirmed },
      { status, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "ens_sync_confirm_failed";
    status = statusForError(message);
    return NextResponse.json({ error: message }, { status });
  } finally {
    await logApiUsage({
      endpoint: "/api/handles/[handle]/socials/[socialId]/ens/confirm",
      method: "POST",
      status,
      latencyMs: Date.now() - started,
      clientKey,
    }).catch(() => undefined);
  }
}
