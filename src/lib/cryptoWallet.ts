import { getAddress, isAddress, verifyMessage } from "ethers";

export { BASE_CHAIN_HEX, BASE_CHAIN_ID, BASE_CHAIN_NAME } from "./cryptoConfig";
import { BASE_CHAIN_ID } from "./cryptoConfig";

export const WALLET_LINK_TTL_MS = 10 * 60 * 1000;

export type WalletLinkMessage = {
  handle: string;
  timestamp: number;
  nonce: string;
};

export function validateEvmAddress(input: string) {
  const value = input.trim();
  if (!isAddress(value)) return null;
  return getAddress(value);
}

export function isBaseNetwork(chainId: string | number | null | undefined) {
  if (chainId == null) return false;
  if (typeof chainId === "number") return chainId === BASE_CHAIN_ID;
  const trimmed = chainId.trim().toLowerCase();
  if (!trimmed) return false;
  try {
    return Number(trimmed.startsWith("0x") ? BigInt(trimmed) : Number(trimmed)) === BASE_CHAIN_ID;
  } catch {
    return false;
  }
}

export function createWalletLinkMessage({
  displayHandle,
  timestamp,
  nonce,
}: {
  displayHandle: string;
  timestamp: number;
  nonce: string;
}) {
  return [
    `Link wallet to NairaTag handle: ${displayHandle}`,
    `Timestamp: ${timestamp}`,
    `Nonce: ${nonce}`,
  ].join("\n");
}

export function parseWalletLinkMessage(message: string): WalletLinkMessage | null {
  const lines = message.split(/\r?\n/).map((line) => line.trim());
  const handle = lines[0]?.match(/^Link wallet to NairaTag handle:\s*(.+)$/)?.[1];
  const timestampValue = lines[1]?.match(/^Timestamp:\s*(\d+)$/)?.[1];
  const nonce = lines[2]?.match(/^Nonce:\s*([a-zA-Z0-9_-]{16,128})$/)?.[1];
  if (!handle || !timestampValue || !nonce) return null;

  const timestamp = Number(timestampValue);
  if (!Number.isSafeInteger(timestamp) || timestamp <= 0) return null;

  return { handle, timestamp, nonce };
}

export function isFreshWalletLinkTimestamp(timestamp: number, now = Date.now()) {
  return Math.abs(now - timestamp) <= WALLET_LINK_TTL_MS;
}

export async function verifyWalletSignature({
  message,
  signature,
  walletAddress,
}: {
  message: string;
  signature: string;
  walletAddress: string;
}) {
  const expected = validateEvmAddress(walletAddress);
  if (!expected || !signature.startsWith("0x")) return false;

  try {
    const recovered = verifyMessage(message, signature);
    return getAddress(recovered) === expected;
  } catch {
    return false;
  }
}
