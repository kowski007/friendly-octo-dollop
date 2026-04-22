import { NextResponse, type NextRequest } from "next/server";

import { listNotifications } from "@/lib/adminStore";

function toInt(value: string | null, fallback: number) {
  if (!value) return fallback;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

export async function GET(req: NextRequest) {
  const limit = Math.min(
    100,
    Math.max(1, toInt(req.nextUrl.searchParams.get("limit"), 25))
  );
  const offset = Math.max(0, toInt(req.nextUrl.searchParams.get("offset"), 0));
  const unreadOnly = req.nextUrl.searchParams.get("unread") === "1";

  const data = await listNotifications({ limit, offset, unreadOnly });
  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}
