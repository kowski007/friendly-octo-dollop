This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## NairaTag Crypto Wallet Linking Layer

Phase 1 links a claimed NairaTag handle to a user-owned EVM wallet on Base.
NairaTag does not create wallets, store private keys, or custody funds. It only
stores a verified mapping from a canonical handle such as `femi` to a wallet
address.

Wallet linking flow:

1. User signs in and claims a handle.
2. User opens the dashboard and clicks `Link wallet`.
3. The browser connects an injected EVM wallet and switches/adds Base.
4. The user signs this message shape:

```text
Link wallet to NairaTag handle: ₦femi
Timestamp: <unix_timestamp_ms>
Nonce: <random_nonce>
```

5. `POST /api/wallet/link` verifies the signature server-side, checks the
   signed wallet matches the submitted address, confirms the signed-in user owns
   the handle, rejects wrong-chain requests, and stores the verified wallet.

Storage fields include `user_id`, canonical `handle`, `display_handle`,
`wallet_address`, `chain`, `is_default`, `wallet_verified`, `signature_hash`,
`nonce`, `created_at`, and `updated_at`.

Security notes:

- Private keys are never requested or stored.
- Wallet signatures are verified server-side with EVM signature recovery.
- Nonces are stored to prevent replay.
- The V1 chain is Base only (`8453`).
- One default wallet per handle is active in V1.

## NairaTag Crypto Resolve + Send Engine

Phase 2 lets a sender transfer Base USDC to a NairaTag handle without typing the
receiver's raw wallet address.

Resolver endpoint:

```http
GET /api/resolve/crypto?handle=femi&chain=base&asset=USDC
```

Success response:

```json
{
  "status": "success",
  "handle": "femi",
  "display_handle": "₦femi",
  "chain": "base",
  "asset": "USDC",
  "wallet_address": "0x...",
  "wallet_verified": true,
  "resolution_source": "direct_wallet",
  "token_contract": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  "decimals": 6
}
```

Send flow:

1. Sender opens `/send/crypto`.
2. Sender enters a handle and USDC amount.
3. App resolves the handle through `/api/resolve/crypto`.
4. App shows a confirmation with amount, handle, network, and shortened wallet.
5. Sender connects an injected EVM wallet on Base.
6. App submits an ERC-20 `transfer(address,uint256)` to native USDC on Base.
7. App shows transaction states from resolving through onchain receipt.

V1 send constraints:

- Asset is fixed to native USDC on Base.
- USDC contract is sourced from Circle's official contract-address docs:
  `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`.
- Funds move directly from sender wallet to receiver wallet.
- NairaTag does not custody funds or relay private keys.
- ENS execution is part of the crypto resolution path.
- Payment links can execute through a linked wallet or an ENS-backed address.
- Embedded wallets, chat sending, and multi-chain routing remain out of scope.

## Unified PayLink Widget

The hosted PayLink page at `/pay/[handle]` now supports fiat and crypto routes
inside the same payment surface. The sender sees one recipient identity card and
chooses a method with `Fiat` and `Crypto` tabs.

Fiat route:

```text
GET /api/resolve?handle=femi
```

Crypto route:

```text
GET /api/resolve/crypto?handle=femi&chain=base&asset=USDC
```

Crypto payment links can open the Crypto tab directly:

```text
/pay/femi?asset=USDC&chain=base&amount=10
```

The Crypto tab uses the same non-custodial Base USDC transfer flow as
`/send/crypto`: connect wallet, switch/add Base, submit USDC transfer, and wait
for an onchain receipt.

## ENS Execution Layer

`₦femi` is not directly an ENS name. It is the NairaTag display handle shown to
users. Internally, NairaTag normalizes it to the canonical handle `femi`. The
execution layer can map that canonical handle to a NairaTag-owned ENS namespace
such as `femi.nairatag.eth`, or accept a raw ENS input such as `vitalik.eth`.

```text
User sees:      ₦femi
Canonical:      femi
ENS layer:      femi.nairatag.eth
Resolver:       direct DB / ENS / offchain resolver
Execution:      0x wallet address
```

Direct wallet resolution remains the first source of truth for crypto payments.
ENS stays optional: users should not need to buy `.eth` names to receive
crypto through NairaTag.

Implemented ENS capabilities:

- ENSIP-15 normalization before lookup.
- Base address resolution using the ENSIP-11 coin type.
- Raw ENS destination support in `/api/resolve/crypto` and `/send/crypto`.
- Configurable `{handle}.parent.eth` execution subnames for NairaTag handles.
- Resolver, avatar, and standard text-record lookups in the ENS service layer.
- Reverse lookup with forward verification for primary names.
- ENS subgraph-backed name enumeration through `/api/ens/names`.
- CCIP Read compatible name resolution through the universal resolver flow used
  by viem.

ENS API routes:

- `GET /api/ens/resolve?name=vitalik.eth&chainId=8453`
- `GET /api/ens/reverse?address=0x...&chainId=8453`
- `GET /api/ens/names?address=0x...`

ENS environment variables:

- `NT_ENS_PARENT_NAME=nairatag.eth`
- `NT_ENS_MAINNET_RPC_URL=https://...`
- `NT_ENS_GATEWAY_URLS=https://gateway.example/{sender}/{data}`
- `NT_ENS_SUBGRAPH_URL=https://...`
