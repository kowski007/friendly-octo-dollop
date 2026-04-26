import { NextRequest, NextResponse } from "next/server";

import { logApiUsage, normalizeHandle } from "@/lib/adminStore";
import { prepareTelegramEnsTextSync } from "@/lib/ensSync";
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
    case "ens_owner_wallet_mismatch":
      return 403;
    case "ens_parent_not_configured":
    case "telegram_not_verified":
    case "wallet_required":
    case "ens_name_missing":
    case "ens_resolver_missing":
    case "ens_text_not_supported":
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

    if (!payload) {
      status = 401;
      return NextResponse.json({ error: "unauthorized" }, { status });
    }
    if (!normalizedHandle) {
      status = 400;
      return NextResponse.json({ error: "missing_handle" }, { status });
    }

    const prepared = await prepareTelegramEnsTextSync({
      userId: payload.uid,
      handle: normalizedHandle,
      socialId,
    });

    status = 200;
    return NextResponse.json(
      { ok: true, ...prepared },
      { status, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "ens_sync_prepare_failed";
    status = statusForError(message);
    return NextResponse.json({ error: message }, { status });
  } finally {
    await logApiUsage({
      endpoint: "/api/handles/[handle]/socials/[socialId]/ens/prepare",
      method: "POST",
      status,
      latencyMs: Date.now() - started,
      clientKey,
    }).catch(() => undefined);
  }
}
