import { NextResponse } from "next/server";

import { getAdminMetrics } from "@/lib/adminStore";

export async function GET() {
  try {
    const metrics = await getAdminMetrics();

    return NextResponse.json(
      {
        totalClaims: metrics.totalClaims,
        generatedAt: new Date().toISOString(),
      },
      {
        headers: { "Cache-Control": "no-store, max-age=0" },
      }
    );
  } catch (error) {
    console.error("[stats/claims]", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "claims_stats_failed",
      },
      {
        status: 500,
        headers: { "Cache-Control": "no-store, max-age=0" },
      }
    );
  }
}
