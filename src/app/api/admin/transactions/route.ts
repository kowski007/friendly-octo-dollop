import { NextResponse, type NextRequest } from "next/server";

import { listTransactions } from "@/lib/adminStore";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(Math.max(Number(searchParams.get("limit") || "25"), 1), 200);
  const offset = Math.max(Number(searchParams.get("offset") || "0"), 0);
  const handle = searchParams.get("handle")?.trim() || undefined;

  const data = await listTransactions({ limit, offset, handle });
  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}
