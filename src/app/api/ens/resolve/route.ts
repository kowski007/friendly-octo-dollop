import { NextRequest, NextResponse } from "next/server";

import { BASE_CHAIN_ID } from "@/lib/cryptoConfig";
import { resolveEnsName } from "@/lib/ens";

export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get("name")?.trim() ?? "";
  const chainIdParam = Number(req.nextUrl.searchParams.get("chainId") ?? BASE_CHAIN_ID);
  const chainId =
    Number.isFinite(chainIdParam) && chainIdParam > 0 ? chainIdParam : BASE_CHAIN_ID;

  if (!name) {
    return NextResponse.json(
      { status: "error", code: "MISSING_NAME", message: "Provide an ENS name." },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    const result = await resolveEnsName({ name, chainId });
    if (!result) {
      return NextResponse.json(
        {
          status: "error",
          code: "NOT_FOUND",
          message: "ENS name did not resolve for the requested chain.",
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
        code: "ENS_RESOLVE_FAILED",
        message: error instanceof Error ? error.message : "ENS resolution failed.",
      },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
