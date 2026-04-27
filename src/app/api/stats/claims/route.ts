import { NextResponse } from "next/server";

import { getAdminMetrics } from "@/lib/adminStore";

type ClaimsStatsCache = {
  expiresAt: number;
  payload: {
    totalClaims: number;
    generatedAt: string;
  };
};

let claimsStatsCache: ClaimsStatsCache | null = null;

export async function GET() {
  try {
    const now = Date.now();
    if (claimsStatsCache && claimsStatsCache.expiresAt > now) {
      return NextResponse.json(claimsStatsCache.payload, {
        headers: { "Cache-Control": "no-store, max-age=0" },
      });
    }

    const metrics = await getAdminMetrics();
    const payload = {
      totalClaims: metrics.totalClaims,
      generatedAt: new Date().toISOString(),
    };
    claimsStatsCache = {
      payload,
      expiresAt: now + (process.env.NODE_ENV === "development" ? 60_000 : 15_000),
    };

    return NextResponse.json(payload, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
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
