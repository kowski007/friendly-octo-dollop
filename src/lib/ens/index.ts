import {
  createPublicClient,
  encodeFunctionData,
  getAddress,
  http,
  isAddress,
  zeroAddress,
} from "viem";
import { mainnet, sepolia } from "viem/chains";
import {
  getEnsAddress,
  getEnsAvatar,
  getEnsName,
  getEnsResolver,
  getEnsText,
  normalize,
} from "viem/ens";
import { namehash } from "ethers";

import { BASE_CHAIN_ID } from "@/lib/cryptoConfig";
import type {
  ENSAvatar,
  ENSBulkLookupResult,
  ENSResolver,
  ENSResolutionResult,
  ENSSubgraphDomain,
} from "./types";

const DEFAULT_MAINNET_RPC_URL = "https://ethereum-rpc.publicnode.com";
const DEFAULT_SUBGRAPH_URL = "https://api.thegraph.com/subgraphs/name/ensdomains/ens";
type EnsAddress = `0x${string}`;
type EnsHex = `0x${string}`;
const DEFAULT_ENS_CHAIN_ID = 1;
const DEFAULT_MAINNET_REGISTRY_ADDRESS = "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e";
const DEFAULT_MAINNET_NAME_WRAPPER_ADDRESS =
  "0xD4416b13d2b3a9dB0FEA0676aA55C4BfE4A26D0d";
const DEFAULT_SEPOLIA_REGISTRY_ADDRESS = "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e";
const DEFAULT_SEPOLIA_NAME_WRAPPER_ADDRESS =
  "0x0635513f179D50A207757E05759CbD106d7dFcE8";
const ENS_TEXT_INTERFACE_ID = "0x59d1d43c";

const ENS_REGISTRY_ABI = [
  {
    type: "function",
    name: "owner",
    stateMutability: "view",
    inputs: [{ name: "node", type: "bytes32" }],
    outputs: [{ name: "", type: "address" }],
  },
] as const;

const NAME_WRAPPER_ABI = [
  {
    type: "function",
    name: "ownerOf",
    stateMutability: "view",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
  },
] as const;

const ERC165_ABI = [
  {
    type: "function",
    name: "supportsInterface",
    stateMutability: "view",
    inputs: [{ name: "interfaceID", type: "bytes4" }],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

const TEXT_RESOLVER_ABI = [
  {
    type: "function",
    name: "text",
    stateMutability: "view",
    inputs: [
      { name: "node", type: "bytes32" },
      { name: "key", type: "string" },
    ],
    outputs: [{ name: "", type: "string" }],
  },
  {
    type: "function",
    name: "setText",
    stateMutability: "nonpayable",
    inputs: [
      { name: "node", type: "bytes32" },
      { name: "key", type: "string" },
      { name: "value", type: "string" },
    ],
    outputs: [],
  },
] as const;

type GraphQlResponse<T> = {
  data?: T;
  errors?: Array<{ message?: string }>;
};

function configuredRpcUrl() {
  return (
    process.env.NT_ENS_MAINNET_RPC_URL ||
    process.env.ENS_MAINNET_RPC_URL ||
    process.env.NEXT_PUBLIC_ENS_MAINNET_RPC_URL ||
    DEFAULT_MAINNET_RPC_URL
  ).trim();
}

function configuredEnsChainId() {
  const raw =
    process.env.NT_ENS_CHAIN_ID ||
    process.env.ENS_CHAIN_ID ||
    process.env.NEXT_PUBLIC_ENS_CHAIN_ID ||
    "";
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_ENS_CHAIN_ID;
}

function ensChainConfig() {
  return configuredEnsChainId() === sepolia.id ? sepolia : mainnet;
}

function configuredRegistryAddress() {
  const raw =
    process.env.NT_ENS_REGISTRY_ADDRESS ||
    process.env.ENS_REGISTRY_ADDRESS ||
    process.env.NEXT_PUBLIC_ENS_REGISTRY_ADDRESS ||
    "";
  if (isAddress(raw)) return getAddress(raw);
  return configuredEnsChainId() === sepolia.id
    ? (DEFAULT_SEPOLIA_REGISTRY_ADDRESS as EnsAddress)
    : (DEFAULT_MAINNET_REGISTRY_ADDRESS as EnsAddress);
}

function configuredNameWrapperAddress() {
  const raw =
    process.env.NT_ENS_NAME_WRAPPER_ADDRESS ||
    process.env.ENS_NAME_WRAPPER_ADDRESS ||
    process.env.NEXT_PUBLIC_ENS_NAME_WRAPPER_ADDRESS ||
    "";
  if (isAddress(raw)) return getAddress(raw);
  return configuredEnsChainId() === sepolia.id
    ? (DEFAULT_SEPOLIA_NAME_WRAPPER_ADDRESS as EnsAddress)
    : (DEFAULT_MAINNET_NAME_WRAPPER_ADDRESS as EnsAddress);
}

function configuredSubgraphUrl() {
  return (
    process.env.NT_ENS_SUBGRAPH_URL ||
    process.env.ENS_SUBGRAPH_URL ||
    process.env.NEXT_PUBLIC_ENS_SUBGRAPH_URL ||
    DEFAULT_SUBGRAPH_URL
  ).trim();
}

function configuredGatewayUrls() {
  const raw =
    process.env.NT_ENS_GATEWAY_URLS ||
    process.env.ENS_GATEWAY_URLS ||
    process.env.NEXT_PUBLIC_ENS_GATEWAY_URLS ||
    "";

  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function configuredParentName() {
  return (
    process.env.NT_ENS_PARENT_NAME ||
    process.env.ENS_PARENT_NAME ||
    process.env.NEXT_PUBLIC_ENS_PARENT_NAME ||
    ""
  )
    .trim()
    .toLowerCase();
}

function ensClient() {
  return createPublicClient({
    chain: ensChainConfig(),
    transport: http(configuredRpcUrl()),
  });
}

export function ensCoinTypeForChain(chainId: number) {
  return BigInt((0x80000000 | chainId) >>> 0);
}

export const BASE_ENS_COIN_TYPE = ensCoinTypeForChain(BASE_CHAIN_ID);

export function isPotentialEnsName(input: string) {
  return input.includes(".");
}

export function normalizeEnsNameSafe(input: string) {
  try {
    return normalize(input.trim());
  } catch {
    return null;
  }
}

export function nairaTagEnsName(handle: string) {
  const parent = configuredParentName();
  if (!parent) return null;

  const cleanHandle = handle.trim().toLowerCase();
  if (!cleanHandle) return null;

  return normalizeEnsNameSafe(`${cleanHandle}.${parent}`);
}

export function ensSyncChainId() {
  return configuredEnsChainId();
}

export function ensRegistryAddress() {
  return configuredRegistryAddress();
}

export function ensNameWrapperAddress() {
  return configuredNameWrapperAddress();
}

export function ensTextRecordKeyTelegram() {
  return "org.telegram";
}

export type ENSOnchainTextRecordStatus = {
  name: string;
  node: EnsHex;
  ownerAddress: EnsAddress | null;
  resolverAddress: EnsAddress | null;
  supportsTextRecords: boolean;
  currentValue: string | null;
};

export type ENSPreparedSetTextTransaction = {
  chainId: number;
  name: string;
  node: EnsHex;
  resolverAddress: EnsAddress;
  ownerAddress: EnsAddress | null;
  key: string;
  value: string;
  data: EnsHex;
};

async function resolveEffectiveEnsOwner(name: string): Promise<EnsAddress | null> {
  const normalized = normalizeEnsNameSafe(name);
  if (!normalized) return null;

  const client = ensClient();
  const node = namehash(normalized) as EnsHex;
  const registryOwner = await client
    .readContract({
      address: configuredRegistryAddress(),
      abi: ENS_REGISTRY_ABI,
      functionName: "owner",
      args: [node],
    })
    .catch(() => null);

  if (!registryOwner || registryOwner === zeroAddress || !isAddress(registryOwner)) {
    return null;
  }

  const ownerAddress = getAddress(registryOwner);
  const wrapperAddress = configuredNameWrapperAddress();
  if (ownerAddress.toLowerCase() !== wrapperAddress.toLowerCase()) {
    return ownerAddress;
  }

  const wrappedOwner = await client
    .readContract({
      address: wrapperAddress,
      abi: NAME_WRAPPER_ABI,
      functionName: "ownerOf",
      args: [BigInt(node)],
    })
    .catch(() => null);

  return wrappedOwner && isAddress(wrappedOwner) ? getAddress(wrappedOwner) : ownerAddress;
}

export async function inspectEnsTextRecord({
  name,
  key,
}: {
  name: string;
  key: string;
}): Promise<ENSOnchainTextRecordStatus | null> {
  const normalized = normalizeEnsNameSafe(name);
  if (!normalized) return null;

  const client = ensClient();
  const node = namehash(normalized) as EnsHex;
  const resolver = await getEnsResolver(client, { name: normalized }).catch(() => null);
  const resolverAddress =
    resolver && isAddress(resolver) ? getAddress(resolver) : null;
  const ownerAddress = await resolveEffectiveEnsOwner(normalized);

  if (!resolverAddress) {
    return {
      name: normalized,
      node,
      ownerAddress,
      resolverAddress: null,
      supportsTextRecords: false,
      currentValue: null,
    };
  }

  const supportsTextRecords = await client
    .readContract({
      address: resolverAddress,
      abi: ERC165_ABI,
      functionName: "supportsInterface",
      args: [ENS_TEXT_INTERFACE_ID],
    })
    .catch(() => false);

  const currentValue = supportsTextRecords
    ? await client
        .readContract({
          address: resolverAddress,
          abi: TEXT_RESOLVER_ABI,
          functionName: "text",
          args: [node, key],
        })
        .catch(() => null)
    : null;

  return {
    name: normalized,
    node,
    ownerAddress,
    resolverAddress,
    supportsTextRecords,
    currentValue: typeof currentValue === "string" ? currentValue : null,
  };
}

export async function prepareEnsSetTextTransaction({
  name,
  key,
  value,
}: {
  name: string;
  key: string;
  value: string;
}): Promise<ENSPreparedSetTextTransaction | null> {
  const status = await inspectEnsTextRecord({ name, key });
  if (!status || !status.resolverAddress || !status.supportsTextRecords) {
    return null;
  }

  return {
    chainId: configuredEnsChainId(),
    name: status.name,
    node: status.node,
    resolverAddress: status.resolverAddress,
    ownerAddress: status.ownerAddress,
    key,
    value,
    data: encodeFunctionData({
      abi: TEXT_RESOLVER_ABI,
      functionName: "setText",
      args: [status.node, key, value],
    }),
  };
}

export async function waitForEnsTransactionReceipt(txHash: EnsHex) {
  return ensClient().waitForTransactionReceipt({
    hash: txHash,
    confirmations: 1,
  });
}

export async function getEnsTransaction(txHash: EnsHex) {
  return ensClient().getTransaction({ hash: txHash });
}

export async function resolveEnsName({
  name,
  chainId = BASE_CHAIN_ID,
}: {
  name: string;
  chainId?: number;
}): Promise<ENSResolutionResult | null> {
  const normalized = normalizeEnsNameSafe(name);
  if (!normalized) return null;

  const client = ensClient();
  const gatewayUrls = configuredGatewayUrls();
  const request = gatewayUrls.length ? { gatewayUrls } : {};
  const coinType = ensCoinTypeForChain(chainId);

  const [address, resolverAddress, avatarUrl, description, url, twitter, github] =
    await Promise.all([
      getEnsAddress(client, { name: normalized, coinType, ...request }),
      getEnsResolver(client, { name: normalized }).catch(() => null),
      getEnsAvatar(client, { name: normalized, ...request }).catch(() => null),
      getEnsText(client, { name: normalized, key: "description", ...request }).catch(
        () => null
      ),
      getEnsText(client, { name: normalized, key: "url", ...request }).catch(() => null),
      getEnsText(client, { name: normalized, key: "com.twitter", ...request }).catch(
        () => null
      ),
      getEnsText(client, { name: normalized, key: "com.github", ...request }).catch(
        () => null
      ),
    ]);

  if (!address) return null;

  const avatar: ENSAvatar | undefined = avatarUrl
    ? {
        url: avatarUrl,
        type: avatarUrl.startsWith("eip155:") ? "erc721" : "uri",
      }
    : undefined;

  const resolver: ENSResolver | undefined = resolverAddress
    ? {
        address: resolverAddress,
        implementation: gatewayUrls.length ? "ccip" : "custom",
        supportedInterfaces: [],
      }
    : undefined;

  return {
    name: normalized,
    address,
    chainId,
    records: {
      name: normalized,
      address,
      text: {
        description: description ?? "",
        url: url ?? "",
        "com.twitter": twitter ?? "",
        "com.github": github ?? "",
      },
      avatar: avatarUrl ?? undefined,
      description: description ?? undefined,
      url: url ?? undefined,
      twitter: twitter ?? undefined,
      github: github ?? undefined,
    },
    avatar,
    resolver,
    resolvedAt: Date.now(),
  };
}

export async function resolveEnsExecutionTarget(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (isPotentialEnsName(trimmed)) {
    const explicit = await resolveEnsName({ name: trimmed, chainId: BASE_CHAIN_ID });
    if (!explicit) return null;

    return {
      ...explicit,
      source: "ens_name" as const,
      displayName: explicit.name,
      executionName: explicit.name,
    };
  }

  const subname = nairaTagEnsName(trimmed);
  if (!subname) return null;

  const resolved = await resolveEnsName({ name: subname, chainId: BASE_CHAIN_ID });
  if (!resolved) return null;

  return {
    ...resolved,
    source: "ens_subname" as const,
    displayName: `\u20A6${trimmed.toLowerCase()}`,
    executionName: subname,
  };
}

export async function reverseResolveEns(address: string, chainId = BASE_CHAIN_ID) {
  if (!isAddress(address)) return null;

  const checksumAddress = getAddress(address);
  const client = ensClient();
  const gatewayUrls = configuredGatewayUrls();
  const request = gatewayUrls.length ? { gatewayUrls } : {};
  const coinType = ensCoinTypeForChain(chainId);
  const name = await getEnsName(client, {
    address: checksumAddress,
    coinType,
    ...request,
  }).catch(() => null);

  if (!name) return null;

  const forward = await getEnsAddress(client, {
    name,
    coinType,
    ...request,
  }).catch(() => null);

  if (!forward || getAddress(forward) !== checksumAddress) return null;

  const avatar = await getEnsAvatar(client, { name, ...request }).catch(() => null);

  return {
    address: checksumAddress,
    primaryName: name,
    avatar: avatar ?? null,
    chainId,
  };
}

export async function listEnsNamesForAddress(address: string): Promise<ENSBulkLookupResult> {
  if (!isAddress(address)) {
    return {
      address,
      name: null,
      names: [],
      primaryName: null,
      avatars: {},
    };
  }

  const lowered = address.toLowerCase();
  const response = await fetch(configuredSubgraphUrl(), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      query: `
        query GetEnsNames($owner: String!) {
          domains(where: { owner: $owner }, first: 50) {
            name
          }
          wrappedDomains(where: { owner: $owner }, first: 50) {
            name
          }
        }
      `,
      variables: { owner: lowered },
    }),
    cache: "no-store",
  });

  const json = (await response.json()) as GraphQlResponse<{
    domains?: Array<Pick<ENSSubgraphDomain, "name">>;
    wrappedDomains?: Array<Pick<ENSSubgraphDomain, "name">>;
  }>;

  if (!response.ok || json.errors?.length) {
    throw new Error(json.errors?.[0]?.message || `ens_subgraph_http_${response.status}`);
  }

  const names = Array.from(
    new Set(
      [...(json.data?.domains ?? []), ...(json.data?.wrappedDomains ?? [])]
        .map((entry) => entry.name)
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b));

  const reverse = await reverseResolveEns(lowered).catch(() => null);
  const gatewayUrls = configuredGatewayUrls();
  const request = gatewayUrls.length ? { gatewayUrls } : {};
  const avatars = Object.fromEntries(
    (await Promise.all(
      names.slice(0, 10).map(async (name) => {
        const avatar = await getEnsAvatar(ensClient(), {
          name,
          ...request,
        }).catch(() => null);

        return avatar
          ? [
              name,
              {
                url: avatar,
                type: avatar.startsWith("eip155:") ? "erc721" : "uri",
              } satisfies ENSAvatar,
            ]
          : null;
      })
    )).filter(Boolean) as Array<[string, ENSAvatar]>
  );

  return {
    address: lowered,
    name: reverse?.primaryName ?? names[0] ?? null,
    names,
    primaryName: reverse?.primaryName ?? null,
    avatars,
  };
}
