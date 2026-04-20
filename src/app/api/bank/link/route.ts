import { NextResponse, type NextRequest } from "next/server";

import { linkBankAccountForUser, logApiUsage } from "@/lib/adminStore";
import { findFallbackBank } from "@/lib/nigerianBanks";
import { lookupBankAccount } from "@/lib/monoLookup";
import { verifySessionToken } from "@/lib/session";

export async function POST(req: NextRequest) {
  const started = Date.now();
  const clientKey = req.headers.get("x-nt-api-key") ?? undefined;

  let status = 200;

  try {
    const token = req.cookies.get("nt_session")?.value || "";
    const payload = token ? verifySessionToken(token) : null;
    if (!payload) {
      status = 401;
      const res = NextResponse.json(
        { error: "unauthorized" },
        { status, headers: { "Cache-Control": "no-store" } }
      );
      await logApiUsage({
        endpoint: "/api/bank/link",
        method: "POST",
        status,
        latencyMs: Date.now() - started,
        clientKey,
      });
      return res;
    }

    const body = (await req.json().catch(() => null)) as
      | {
          bankCode?: string;
          bankName?: string;
          nipCode?: string;
          accountNumber?: string;
        }
      | null;

    const rawBankCode = body?.bankCode?.trim() ?? "";
    const fallbackBank =
      (body?.bankName ? findFallbackBank(body.bankName) : null) ||
      (rawBankCode ? findFallbackBank(rawBankCode) : null);
    const bankCode = rawBankCode || fallbackBank?.bankCode || "";
    const bankName = body?.bankName?.trim() || fallbackBank?.bankName || "";
    const nipCode = body?.nipCode?.trim() || fallbackBank?.nipCode;
    const accountNumber = body?.accountNumber ?? "";

    const lookup = await lookupBankAccount({ accountNumber, nipCode });
    if (lookup.status === "failed") {
      status =
        lookup.message === "Account numbers must be 10 digits." ? 400 : 502;
      const res = NextResponse.json(
        { error: lookup.message },
        { status, headers: { "Cache-Control": "no-store" } }
      );
      await logApiUsage({
        endpoint: "/api/bank/link",
        method: "POST",
        status,
        latencyMs: Date.now() - started,
        clientKey,
      });
      return res;
    }

    const result = await linkBankAccountForUser({
      userId: payload.uid,
      bankCode,
      bankName,
      nipCode,
      accountNumber,
      accountName: lookup.status === "verified" ? lookup.accountName : undefined,
      provider: lookup.provider,
      status: lookup.status === "verified" ? "verified" : "pending_lookup",
      lookupMessage: lookup.message,
    });

    status = lookup.status === "verified" ? 200 : 202;
    const res = NextResponse.json(
      {
        ok: true,
        ...result,
        lookup: {
          status: result.bankAccount.status,
          provider: result.bankAccount.provider,
          message: result.bankAccount.lookupMessage,
        },
      },
      { status, headers: { "Cache-Control": "no-store" } }
    );

    await logApiUsage({
      endpoint: "/api/bank/link",
      method: "POST",
      status,
      latencyMs: Date.now() - started,
      clientKey,
      handle: result.claim?.handle ?? undefined,
    });

    return res;
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    status =
      message === "missing_bank_code" ||
      message === "missing_bank_name" ||
      message === "invalid_account_number"
        ? 400
        : message === "phone_not_verified" || message === "user_not_found"
          ? 401
          : 500;

    const res = NextResponse.json(
      { error: message },
      { status, headers: { "Cache-Control": "no-store" } }
    );

    await logApiUsage({
      endpoint: "/api/bank/link",
      method: "POST",
      status,
      latencyMs: Date.now() - started,
      clientKey,
    });

    return res;
  }
}
