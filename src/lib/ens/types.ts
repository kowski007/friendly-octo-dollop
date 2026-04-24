/**
 * ENS Type Definitions
 * Complete TypeScript interfaces for ENS operations
 */

export interface ENSName {
  name: string;
  node: string;
  owner: string;
  manager: string;
  resolver: string;
  ttl: number;
  registrar?: string;
  expiry?: number;
}

export interface ENSRecord {
  name: string;
  address?: string;
  coin?: {
    [key: string]: string;
  };
  text?: {
    [key: string]: string;
  };
  contenthash?: string;
  avatar?: string;
  description?: string;
  email?: string;
  url?: string;
  twitter?: string;
  github?: string;
  discord?: string;
  telegram?: string;
}

export interface ENSTextRecord {
  key: string;
  value: string;
}

export interface ENSAvatar {
  url: string;
  type: 'uri' | 'erc721' | 'erc1155';
  chainId?: number;
  contractAddress?: string;
  tokenId?: string;
}

export interface ENSReverseRecord {
  address: string;
  name: string | null;
  resolver: string | null;
  canSetResolver: boolean;
  canSetName: boolean;
}

export interface ENSSubname {
  id: string;
  name: string;
  owner: string;
  manager: string;
  resolver: string;
  ttl: number;
  expiry?: number;
}

export interface ENSRegistration {
  name: string;
  owner: string;
  registeredAt: number;
  expiryDate: number;
  duration?: number;
  durationUnit?: 'year' | 'month' | 'day';
}

export interface ENSResolver {
  address: string;
  implementation: 'public' | 'custom' | 'ccip';
  supportedInterfaces: string[];
}

export interface ENSPrimaryName {
  name: string;
  address: string;
  chainId: number;
}

export interface ENSMultichainAddress {
  coinType: string;
  address: string;
  chainId?: number;
}

export interface AIAgentRegistryRecord {
  agentName: string;
  ensName: string;
  registryAddress: string;
  verified: boolean;
  verificationMethod: 'text-record' | 'on-chain';
}

export interface ENSSubgraphDomain {
  id: string;
  name: string;
  owner: string;
  registrant: string;
  controller: string;
  resolver: string;
  ttl: string;
  resolvedAddress: string;
  expiryDate: string;
  registrationDate: string;
  subdomainCount: string;
  isMigrated: boolean;
  parent: {
    id: string;
    name: string;
  };
  subdomains: ENSSubgraphDomain[];
}

export interface ENSSubgraphAccount {
  id: string;
  domains: ENSSubgraphDomain[];
  registrations: Array<{
    domain: ENSSubgraphDomain;
    expiryDate: string;
  }>;
}

export interface ENSResolutionResult {
  name: string;
  address: string;
  chainId?: number;
  records?: ENSRecord;
  avatar?: ENSAvatar;
  resolver?: ENSResolver;
  resolvedAt: number;
  ttl?: number;
}

export interface ENSTransactionData {
  to: string;
  data: string;
  value?: string;
  gasEstimate?: string;
}

export interface ENSBulkLookupResult {
  address: string;
  name: string | null;
  names: string[];
  primaryName: string | null;
  avatars: { [name: string]: ENSAvatar };
}

export interface ENSCacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export enum ENSChain {
  Sepolia = 11155111,
  Holesky = 17000,
  Mainnet = 1,
  Base = 8453,
  Arbitrum = 42161,
  Optimism = 10,
  Linea = 59144,
  Scroll = 534352,
}

export enum CoinType {
  ETH = '60',
  BTC = '0',
  LTC = '2',
  DOGE = '3',
  DASH = '5',
  ATOM = '118',
  SOL = '501',
  MATIC = '966',
  AVAX = '43114',
}
