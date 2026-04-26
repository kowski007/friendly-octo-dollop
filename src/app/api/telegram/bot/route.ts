import { NextResponse, type NextRequest } from "next/server";

import {
  authorizeTelegramWebhook,
  handleTelegramBotUpdate,
  logTelegramBotWebhook,
  type TelegramUpdate,
} from "@/lib/telegramBot";

export async function POST(req: NextRequest) {
  const started = Date.now();

  if (!authorizeTelegramWebhook(req.headers)) {
    await logTelegramBotWebhook(401, Date.now() - started);
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    const body = (await req.json().catch(() => null)) as TelegramUpdate | null;
    if (!body) {
      await logTelegramBotWebhook(400, Date.now() - started);
      return NextResponse.json(
        { error: "invalid_body" },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    await handleTelegramBotUpdate(body);
    await logTelegramBotWebhook(200, Date.now() - started);
    return NextResponse.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    await logTelegramBotWebhook(500, Date.now() - started);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "unknown_error",
      },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
