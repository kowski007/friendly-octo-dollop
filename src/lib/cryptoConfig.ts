export const BASE_CHAIN_ID = 8453;
export const BASE_CHAIN_HEX = "0x2105";
export const BASE_CHAIN_NAME = "Base";

export const BASE_USDC = {
  asset: "USDC",
  chain: "base",
  chainId: BASE_CHAIN_ID,
  contractAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  decimals: 6,
} as const;

export type SupportedCryptoAsset = typeof BASE_USDC.asset;
export type CryptoResolutionSource = "direct_wallet" | "ens_subname" | "ens_name";

export type CryptoResolveSuccess = {
  status: "success";
  handle: string;
  display_handle: string;
  chain: "base";
  asset: "USDC";
  wallet_address: string;
  wallet_verified: true;
  resolution_source: CryptoResolutionSource;
  resolved_name?: string | null;
  resolver_address?: string | null;
  avatar?: string | null;
  token_contract: string;
  decimals: number;
};

export type CryptoResolveError = {
  status: "error";
  code: string;
  message: string;
  handle?: string;
  display_handle?: string;
  chain?: "base";
  asset?: "USDC";
};

export function normalizeCryptoAsset(input: string | null | undefined) {
  const asset = (input || "USDC").trim().toUpperCase();
  return asset === BASE_USDC.asset ? BASE_USDC.asset : null;
}

export function normalizeCryptoChain(input: string | null | undefined) {
  const chain = (input || "base").trim().toLowerCase();
  return chain === BASE_USDC.chain ? BASE_USDC.chain : null;
}

export function cryptoResolutionSourceLabel(source: CryptoResolutionSource) {
  switch (source) {
    case "ens_subname":
      return "ENS subname";
    case "ens_name":
      return "ENS name";
    default:
      return "Direct wallet";
  }
}
