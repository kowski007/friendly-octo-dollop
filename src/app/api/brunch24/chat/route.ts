import { NextRequest, NextResponse } from "next/server";

import { getBrunch24Reply } from "@/lib/brunch24/reply";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { message?: string };
    const message = body.message ?? "";

    return NextResponse.json(getBrunch24Reply(message));
  } catch {
    return NextResponse.json(
      {
        reply:
          "The Brunch24 local tester could not read that request. Try a simple prompt like 'Find dinner spots in Lekki'.",
        suggestions: [
          "Find dinner spots in Lekki",
          "Find hotels in Victoria Island",
          "What events are happening this weekend?",
        ],
      },
      { status: 400 }
    );
  }
}
