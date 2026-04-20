import { NextResponse } from "next/server";

import { getAdminMetrics } from "@/lib/adminStore";

export async function GET() {
  try {
    const metrics = await getAdminMetrics();
    return NextResponse.json(metrics, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("[admin/metrics]", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "metrics_failed",
      },
      {
        status: 500,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }
}
