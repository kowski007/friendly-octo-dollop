import { NextResponse, type NextRequest } from "next/server";

import { logApiUsage } from "@/lib/adminStore";
import { listBankDirectory } from "@/lib/monoLookup";

export async function GET(req: NextRequest) {
  const started = Date.now();
  const clientKey = req.headers.get("x-nt-api-key") ?? undefined;

  let status = 200;

  try {
    const query = req.nextUrl.searchParams.get("q")?.trim().toLowerCase() ?? "";
    const directory = await listBankDirectory();
    const banks = query
      ? directory.banks.filter(
          (bank) =>
            bank.bankName.toLowerCase().includes(query) ||
            bank.bankCode.toLowerCase().includes(query) ||
            (bank.nipCode || "").toLowerCase().includes(query)
        )
      : directory.banks;

    const res = NextResponse.json(
      { ok: true, ...directory, banks },
      { status, headers: { "Cache-Control": "no-store" } }
    );

    await logApiUsage({
      endpoint: "/api/banks",
      method: "GET",
      status,
      latencyMs: Date.now() - started,
      clientKey,
    });

    return res;
  } catch (error) {
    status = 500;
    const res = NextResponse.json(
      { error: error instanceof Error ? error.message : "unknown_error" },
      { status, headers: { "Cache-Control": "no-store" } }
    );

    await logApiUsage({
      endpoint: "/api/banks",
      method: "GET",
      status,
      latencyMs: Date.now() - started,
      clientKey,
    });

    return res;
  }
}
