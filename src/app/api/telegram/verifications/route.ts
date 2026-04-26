import { NextResponse, type NextRequest } from "next/server";

import { logApiUsage, recordTelegramVerificationEvent } from "@/lib/adminStore";

function ingestSecret() {
  return (process.env.NT_TELEGRAM_INGEST_SECRET || "").trim();
}

function authorize(req: NextRequest) {
  const secret = ingestSecret();
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }

  return req.headers.get("x-nt-telegram-secret") === secret;
}

export async function POST(req: NextRequest) {
  const started = Date.now();
  const clientKey = req.headers.get("x-nt-api-key") ?? undefined;

  if (!authorize(req)) {
    const res = NextResponse.json(
      { error: "unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
    await logApiUsage({
      endpoint: "/api/telegram/verifications",
      method: "POST",
      status: 401,
      latencyMs: Date.now() - started,
      clientKey,
    });
    return res;
  }

  try {
    const body = (await req.json().catch(() => null)) as
      | {
          username?: string;
          code?: string;
          messageText?: string;
          telegramUserId?: string;
          telegramChatId?: string;
        }
      | null;

    const record = await recordTelegramVerificationEvent({
      username: body?.username ?? "",
      code: body?.code ?? "",
      messageText: body?.messageText,
      telegramUserId: body?.telegramUserId,
      telegramChatId: body?.telegramChatId,
    });

    const res = NextResponse.json(
      { ok: true, record },
      { headers: { "Cache-Control": "no-store" } }
    );
    await logApiUsage({
      endpoint: "/api/telegram/verifications",
      method: "POST",
      status: 200,
      latencyMs: Date.now() - started,
      clientKey,
    });
    return res;
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status =
      message === "invalid_telegram_username" ||
      message === "invalid_verification_code"
        ? 400
        : 500;
    const res = NextResponse.json(
      { error: message },
      { status, headers: { "Cache-Control": "no-store" } }
    );
    await logApiUsage({
      endpoint: "/api/telegram/verifications",
      method: "POST",
      status,
      latencyMs: Date.now() - started,
      clientKey,
    });
    return res;
  }
}
