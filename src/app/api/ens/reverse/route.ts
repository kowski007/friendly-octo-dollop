import { NextRequest, NextResponse } from "next/server";

import { BASE_CHAIN_ID } from "@/lib/cryptoConfig";
import { reverseResolveEns } from "@/lib/ens";

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address")?.trim() ?? "";
  const chainIdParam = Number(req.nextUrl.searchParams.get("chainId") ?? BASE_CHAIN_ID);
  const chainId =
    Number.isFinite(chainIdParam) && chainIdParam > 0 ? chainIdParam : BASE_CHAIN_ID;

  if (!address) {
    return NextResponse.json(
      { status: "error", code: "MISSING_ADDRESS", message: "Provide an address." },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    const result = await reverseResolveEns(address, chainId);
    if (!result) {
      return NextResponse.json(
        {
          status: "error",
          code: "NOT_FOUND",
          message: "No verified ENS primary name was found for this address.",
        },
        { status: 404, headers: { "Cache-Control": "no-store" } }
      );
    }

    return NextResponse.json(
      { status: "success", ...result },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        code: "ENS_REVERSE_FAILED",
        message: error instanceof Error ? error.message : "ENS reverse resolution failed.",
      },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
