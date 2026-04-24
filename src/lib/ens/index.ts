import { createPublicClient, getAddress, http, isAddress } from "viem";
import { mainnet } from "viem/chains";
import {
  getEnsAddress,
  getEnsAvatar,
  getEnsName,
  getEnsResolver,
  getEnsText,
  normalize,
} from "viem/ens";

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
    chain: mainnet,
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
