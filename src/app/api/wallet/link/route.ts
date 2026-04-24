import { NextResponse, type NextRequest } from "next/server";

import {
  createWalletLinkMessage,
  isBaseNetwork,
  isFreshWalletLinkTimestamp,
  parseWalletLinkMessage,
  validateEvmAddress,
  verifyWalletSignature,
} from "@/lib/cryptoWallet";
import {
  linkCryptoWalletForHandle,
  logApiUsage,
  normalizeHandle,
} from "@/lib/adminStore";
import { verifySessionToken } from "@/lib/session";

type WalletLinkBody = {
  handle?: string;
  wallet_address?: string;
  walletAddress?: string;
  signature?: string;
  message?: string;
  chain_id?: string | number;
  chainId?: string | number;
};

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json(
    { status: "error", code, message },
    { status, headers: { "Cache-Control": "no-store" } }
  );
}

function statusForError(message: string) {
  switch (message) {
    case "handle_not_owned":
      return { status: 403, code: "HANDLE_NOT_OWNED", text: "This handle does not belong to the signed-in user." };
    case "handle_not_found":
      return { status: 404, code: "HANDLE_NOT_FOUND", text: "This handle has not been claimed." };
    case "wallet_linked_to_another_user":
      return { status: 409, code: "WALLET_ALREADY_LINKED", text: "This wallet is already linked to another user." };
    case "nonce_already_used":
      return { status: 409, code: "NONCE_ALREADY_USED", text: "This wallet verification nonce has already been used." };
    case "missing_handle":
    case "invalid_handle":
      return { status: 400, code: "INVALID_HANDLE", text: "Enter a valid NairaTag handle." };
    default:
      return { status: 500, code: "WALLET_LINK_FAILED", text: "Unable to link wallet right now." };
  }
}

export async function POST(req: NextRequest) {
  const started = Date.now();
  const clientKey = req.headers.get("x-nt-api-key") ?? undefined;
  let status = 200;

  try {
    const token = req.cookies.get("nt_session")?.value || "";
    const payload = token ? verifySessionToken(token) : null;
    if (!payload) {
      status = 401;
      return errorResponse("UNAUTHORIZED", "Sign in before linking a wallet.", status);
    }

    const body = (await req.json().catch(() => null)) as WalletLinkBody | null;
    const submittedHandle = body?.handle ?? "";
    const normalizedHandle = normalizeHandle(submittedHandle);
    const displayHandle = `\u20A6${normalizedHandle}`;
    const walletAddress = validateEvmAddress(
      body?.wallet_address ?? body?.walletAddress ?? ""
    );
    const signature = body?.signature?.trim() ?? "";
    const message = body?.message ?? "";
    const chainId = body?.chain_id ?? body?.chainId;

    if (!normalizedHandle) {
      status = 400;
      return errorResponse("INVALID_HANDLE", "Enter a valid NairaTag handle.", status);
    }
    if (!walletAddress) {
      status = 400;
      return errorResponse("INVALID_WALLET_ADDRESS", "Enter a valid EVM wallet address.", status);
    }
    if (!isBaseNetwork(chainId)) {
      status = 400;
      return errorResponse("WRONG_CHAIN", "Connect your wallet to Base before linking.", status);
    }
    if (!signature || !message) {
      status = 400;
      return errorResponse("MISSING_SIGNATURE", "Wallet signature is required.", status);
    }

    const parsed = parseWalletLinkMessage(message);
    if (!parsed || normalizeHandle(parsed.handle) !== normalizedHandle) {
      status = 400;
      return errorResponse("INVALID_MESSAGE", "Wallet verification message is invalid.", status);
    }
    if (!isFreshWalletLinkTimestamp(parsed.timestamp)) {
      status = 400;
      return errorResponse("MESSAGE_EXPIRED", "Wallet verification message has expired.", status);
    }

    const expectedMessage = createWalletLinkMessage({
      displayHandle,
      timestamp: parsed.timestamp,
      nonce: parsed.nonce,
    });
    if (message !== expectedMessage) {
      status = 400;
      return errorResponse("INVALID_MESSAGE", "Wallet verification message is invalid.", status);
    }

    const signatureValid = await verifyWalletSignature({
      message,
      signature,
      walletAddress,
    });
    if (!signatureValid) {
      status = 400;
      return errorResponse("INVALID_SIGNATURE", "Wallet verification failed.", status);
    }

    const record = await linkCryptoWalletForHandle({
      userId: payload.uid,
      handle: normalizedHandle,
      walletAddress,
      chain: "base",
      signature,
      nonce: parsed.nonce,
    });

    status = 200;
    return NextResponse.json(
      {
        status: "success",
        handle: record.handle,
        display_handle: record.displayHandle,
        wallet_address: record.walletAddress,
        chain: record.chain,
        wallet_verified: record.walletVerified,
      },
      { status, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    const detail = error instanceof Error ? error.message : "wallet_link_failed";
    const mapped = statusForError(detail);
    status = mapped.status;
    return errorResponse(mapped.code, mapped.text, status);
  } finally {
    await logApiUsage({
      endpoint: "/api/wallet/link",
      method: "POST",
      status,
      latencyMs: Date.now() - started,
      clientKey,
    }).catch((error) => {
      console.warn(
        "[nairatag] Failed to log /api/wallet/link usage:",
        error instanceof Error ? error.message : String(error)
      );
    });
  }
}
