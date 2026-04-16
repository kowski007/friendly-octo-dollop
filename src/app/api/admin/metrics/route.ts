import { NextResponse } from "next/server";

import { getAdminMetrics } from "@/lib/adminStore";

export async function GET() {
  const metrics = await getAdminMetrics();
  return NextResponse.json(metrics, {
    headers: { "Cache-Control": "no-store" },
  });
}

