import { NextResponse, type NextRequest } from "next/server";

import {
  createTelegramSocialLink,
  listHandleSocialsForUser,
  logApiUsage,
} from "@/lib/adminStore";
import { verifySessionToken } from "@/lib/session";

type Context = {
  params: Promise<{ handle: string }>;
};

function statusForError(message: string) {
  switch (message) {
    case "missing_handle":
    case "invalid_telegram_username":
      return 400;
    case "unauthorized":
      return 401;
    case "handle_not_owned":
      return 403;
    case "telegram_username_claimed":
      return 409;
    default:
      return 500;
  }
}

async function sessionUserId(req: NextRequest) {
  const token = req.cookies.get("nt_session")?.value || "";
  const payload = token ? verifySessionToken(token) : null;
  return payload?.uid ?? null;
}

export async function GET(req: NextRequest, { params }: Context) {
  const started = Date.now();
  const clientKey = req.headers.get("x-nt-api-key") ?? undefined;
  const { handle } = await params;
  const userId = await sessionUserId(req);

  if (!userId) {
    const res = NextResponse.json(
      { error: "unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
    await logApiUsage({
      endpoint: "/api/handles/[handle]/socials",
      method: "GET",
      status: 401,
      latencyMs: Date.now() - started,
      clientKey,
      handle,
    });
    return res;
  }

  try {
    const socials = await listHandleSocialsForUser({ userId, handle });
    const res = NextResponse.json(
      { ok: true, socials },
      { headers: { "Cache-Control": "no-store" } }
    );
    await logApiUsage({
      endpoint: "/api/handles/[handle]/socials",
      method: "GET",
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
      endpoint: "/api/handles/[handle]/socials",
      method: "GET",
      status,
      latencyMs: Date.now() - started,
      clientKey,
      handle,
    });
    return res;
  }
}

export async function POST(req: NextRequest, { params }: Context) {
  const started = Date.now();
  const clientKey = req.headers.get("x-nt-api-key") ?? undefined;
  const { handle } = await params;
  const userId = await sessionUserId(req);

  if (!userId) {
    const res = NextResponse.json(
      { error: "unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
    await logApiUsage({
      endpoint: "/api/handles/[handle]/socials",
      method: "POST",
      status: 401,
      latencyMs: Date.now() - started,
      clientKey,
      handle,
    });
    return res;
  }

  try {
    const body = (await req.json().catch(() => null)) as
      | { platform?: string; username?: string }
      | null;
    if ((body?.platform ?? "telegram") !== "telegram") {
      throw new Error("unsupported_social_platform");
    }

    const social = await createTelegramSocialLink({
      userId,
      handle,
      username: body?.username ?? "",
    });

    const res = NextResponse.json(
      { ok: true, social },
      { headers: { "Cache-Control": "no-store" } }
    );
    await logApiUsage({
      endpoint: "/api/handles/[handle]/socials",
      method: "POST",
      status: 200,
      latencyMs: Date.now() - started,
      clientKey,
      handle,
    });
    return res;
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status =
      message === "unsupported_social_platform" ? 400 : statusForError(message);
    const res = NextResponse.json(
      { error: message },
      { status, headers: { "Cache-Control": "no-store" } }
    );
    await logApiUsage({
      endpoint: "/api/handles/[handle]/socials",
      method: "POST",
      status,
      latencyMs: Date.now() - started,
      clientKey,
      handle,
    });
    return res;
  }
}
