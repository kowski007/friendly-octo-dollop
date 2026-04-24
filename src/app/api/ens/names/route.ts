import { NextRequest, NextResponse } from "next/server";

import { listEnsNamesForAddress } from "@/lib/ens";

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address")?.trim() ?? "";

  if (!address) {
    return NextResponse.json(
      { status: "error", code: "MISSING_ADDRESS", message: "Provide an address." },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    const result = await listEnsNamesForAddress(address);
    return NextResponse.json(
      { status: "success", ...result },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        code: "ENS_SUBGRAPH_FAILED",
        message: error instanceof Error ? error.message : "ENS subgraph lookup failed.",
      },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
