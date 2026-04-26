import { NextRequest, NextResponse } from "next/server";

import { logApiUsage, normalizeHandle } from "@/lib/adminStore";
import { getTelegramEnsSyncStatus } from "@/lib/ensSync";
import { verifySessionToken } from "@/lib/session";

type RouteContext = {
  params: Promise<{ handle: string; socialId: string }>;
};

function statusForError(message: string) {
  switch (message) {
    case "missing_handle":
    case "invalid_handle":
      return 400;
    case "social_not_found":
      return 404;
    case "handle_not_owned":
      return 403;
    default:
      return 500;
  }
}

export async function GET(req: NextRequest, { params }: RouteContext) {
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

    const sync = await getTelegramEnsSyncStatus({
      userId: payload.uid,
      handle: normalizedHandle,
      socialId,
    });

    status = 200;
    return NextResponse.json(
      { ok: true, sync },
      { status, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "ens_sync_failed";
    status = statusForError(message);
    return NextResponse.json({ error: message }, { status });
  } finally {
    await logApiUsage({
      endpoint: "/api/handles/[handle]/socials/[socialId]/ens",
      method: "GET",
      status,
      latencyMs: Date.now() - started,
      clientKey,
    }).catch(() => undefined);
  }
}
