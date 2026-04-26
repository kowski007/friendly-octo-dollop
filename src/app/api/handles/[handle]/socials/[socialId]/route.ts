import { NextResponse, type NextRequest } from "next/server";

import { logApiUsage, removeTelegramSocialLink } from "@/lib/adminStore";
import { verifySessionToken } from "@/lib/session";

type Context = {
  params: Promise<{ handle: string; socialId: string }>;
};

function statusForError(message: string) {
  switch (message) {
    case "missing_handle":
      return 400;
    case "unauthorized":
      return 401;
    case "social_not_found":
      return 404;
    default:
      return 500;
  }
}

export async function DELETE(req: NextRequest, { params }: Context) {
  const started = Date.now();
  const clientKey = req.headers.get("x-nt-api-key") ?? undefined;
  const token = req.cookies.get("nt_session")?.value || "";
  const payload = token ? verifySessionToken(token) : null;
  const { handle, socialId } = await params;

  if (!payload) {
    const res = NextResponse.json(
      { error: "unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
    await logApiUsage({
      endpoint: "/api/handles/[handle]/socials/[socialId]",
      method: "DELETE",
      status: 401,
      latencyMs: Date.now() - started,
      clientKey,
      handle,
    });
    return res;
  }

  try {
    const social = await removeTelegramSocialLink({
      userId: payload.uid,
      handle,
      socialId,
    });
    const res = NextResponse.json(
      { ok: true, social },
      { headers: { "Cache-Control": "no-store" } }
    );
    await logApiUsage({
      endpoint: "/api/handles/[handle]/socials/[socialId]",
      method: "DELETE",
      status: 200,
      latencyMs: Date.now() - started,
      clientKey,
      handle,
    });
    return res;
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = statusForError(message);
    const res = NextResponse.json(
      { error: message },
      { status, headers: { "Cache-Control": "no-store" } }
    );
    await logApiUsage({
      endpoint: "/api/handles/[handle]/socials/[socialId]",
      method: "DELETE",
      status,
      latencyMs: Date.now() - started,
      clientKey,
      handle,
    });
    return res;
  }
}
