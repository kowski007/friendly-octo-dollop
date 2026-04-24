import { NextResponse, type NextRequest } from "next/server";

import { normalizeCryptoAsset, normalizeCryptoChain } from "@/lib/cryptoConfig";
import { logApiUsage, resolveCryptoDestination } from "@/lib/adminStore";

function statusForCode(code: string) {
  if (code === "INVALID_HANDLE" || code.startsWith("UNSUPPORTED_")) return 400;
  if (code === "NO_CRYPTO_DESTINATION") return 404;
  return 500;
}

export async function GET(req: NextRequest) {
  const started = Date.now();
  const handle = req.nextUrl.searchParams.get("handle") ?? "";
  const chain = normalizeCryptoChain(req.nextUrl.searchParams.get("chain"));
  const asset = normalizeCryptoAsset(req.nextUrl.searchParams.get("asset"));

  const result = await resolveCryptoDestination({ handle, chain, asset });
  const status = result.status === "success" ? 200 : statusForCode(result.code);

  const res = NextResponse.json(result, {
    status,
    headers: { "Cache-Control": "no-store" },
  });

  const clientKey = req.headers.get("x-nt-api-key") ?? undefined;
  void logApiUsage({
    endpoint: "/api/resolve/crypto",
    method: "GET",
    status,
    latencyMs: Date.now() - started,
    handle: result.handle,
    clientKey,
  }).catch((error) => {
    console.warn(
      "[nairatag] Failed to log /api/resolve/crypto usage:",
      error instanceof Error ? error.message : String(error)
    );
  });

  return res;
}
