"use client";

import Link from "next/link";
import { Interface, parseUnits } from "ethers";
import { type FormEvent, useMemo, useState, useTransition } from "react";

import {
  BASE_CHAIN_HEX,
  BASE_CHAIN_ID,
  BASE_CHAIN_NAME,
  BASE_USDC,
  cryptoResolutionSourceLabel,
  type CryptoResolveError,
  type CryptoResolveSuccess,
} from "@/lib/cryptoConfig";
import { AppPageHeader } from "./AppPageHeader";
import { Badge, Card, Container, cn } from "./ui";

const NAIRA = "\u20A6";
const usdcInterface = new Interface([
  "function transfer(address to, uint256 amount) returns (bool)",
]);

type EthereumProvider = {
  request<T = unknown>(args: { method: string; params?: unknown[] | object }): Promise<T>;
};

type TxState =
  | "idle"
  | "resolving"
  | "ready"
  | "preparing"
  | "awaiting_wallet"
  | "submitted"
  | "success"
  | "failed";

type TransactionReceipt = {
  status?: string;
  transactionHash?: string;
};

function getProvider() {
  return window.ethereum as EthereumProvider | undefined;
}

function normalizeHandleInput(input: string) {
  return input.trim().replace(/^\u20A6/u, "").replace(/^@/u, "").toLowerCase();
}

function maskAddress(value: string) {
  return value.length <= 12 ? value : `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function statusLabel(state: TxState) {
  switch (state) {
    case "resolving":
      return "Resolving handle";
    case "ready":
      return "Ready to send";
    case "preparing":
      return "Preparing";
    case "awaiting_wallet":
      return "Awaiting wallet confirmation";
    case "submitted":
      return "Submitted";
    case "success":
      return "Success";
    case "failed":
      return "Failed";
    default:
      return "Idle";
  }
}

function isBaseChain(chainId: string) {
  try {
    return Number(BigInt(chainId)) === BASE_CHAIN_ID;
  } catch {
    return false;
  }
}

async function ensureBaseNetwork(provider: EthereumProvider) {
  const chainId = await provider.request<string>({ method: "eth_chainId" });
  if (isBaseChain(chainId)) return chainId;

  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: BASE_CHAIN_HEX }],
    });
  } catch (switchError) {
    const code =
      typeof switchError === "object" && switchError && "code" in switchError
        ? Number((switchError as { code?: number }).code)
        : 0;
    if (code !== 4902) throw switchError;

    await provider.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: BASE_CHAIN_HEX,
          chainName: BASE_CHAIN_NAME,
          nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
          rpcUrls: ["https://mainnet.base.org"],
          blockExplorerUrls: ["https://basescan.org"],
        },
      ],
    });
  }

  return provider.request<string>({ method: "eth_chainId" });
}

function parseUsdcInput(amount: string) {
  const trimmed = amount.trim();
  if (!/^\d+(\.\d{1,6})?$/.test(trimmed)) return null;
  if (Number(trimmed) <= 0) return null;
  return parseUnits(trimmed, BASE_USDC.decimals);
}

function toneForState(state: TxState): "neutral" | "verify" | "orange" {
  if (state === "success") return "verify";
  if (state === "failed") return "orange";
  if (["ready", "submitted"].includes(state)) return "verify";
  return "neutral";
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForReceipt(provider: EthereumProvider, txHash: string) {
  const maxAttempts = 60;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const receipt = await provider.request<TransactionReceipt | null>({
      method: "eth_getTransactionReceipt",
      params: [txHash],
    });
    if (receipt) return receipt;
    await sleep(3000);
  }
  return null;
}

export function CryptoSendView() {
  const [handle, setHandle] = useState("");
  const [amount, setAmount] = useState("");
  const [resolved, setResolved] = useState<CryptoResolveSuccess | null>(null);
  const [txHash, setTxHash] = useState("");
  const [state, setState] = useState<TxState>("idle");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const normalizedHandle = normalizeHandleInput(handle);
  const amountUnits = useMemo(() => parseUsdcInput(amount), [amount]);
  const canResolve = Boolean(normalizedHandle && amountUnits);
  const canSend = Boolean(resolved && amountUnits && !isPending);

  function resolveRecipient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setTxHash("");
    setResolved(null);

    if (!normalizedHandle) {
      setError("Enter a valid NairaTag handle or ENS name.");
      return;
    }
    if (!amountUnits) {
      setError("Enter a valid USDC amount.");
      return;
    }

    startTransition(async () => {
      try {
        setState("resolving");
        const params = new URLSearchParams({
          handle: normalizedHandle,
          chain: BASE_USDC.chain,
          asset: BASE_USDC.asset,
        });
        const response = await fetch(`/api/resolve/crypto?${params.toString()}`, {
          cache: "no-store",
        });
        const body = (await response.json().catch(() => null)) as
          | CryptoResolveSuccess
          | CryptoResolveError
          | null;
        if (!response.ok || !body || body.status !== "success") {
          throw new Error(
            body && body.status === "error"
              ? body.message
              : "Unable to resolve recipient."
          );
        }

        setResolved(body);
        setState("ready");
      } catch (err) {
        setState("failed");
        setError(err instanceof Error ? err.message : "Unable to resolve recipient.");
      }
    });
  }

  function sendUsdc() {
    setError("");
    setTxHash("");

    if (!resolved || !amountUnits) return;

    const provider = getProvider();
    if (!provider) {
      setState("failed");
      setError("Install or open an EVM wallet first.");
      return;
    }

    startTransition(async () => {
      try {
        setState("preparing");
        const accounts = await provider.request<string[]>({
          method: "eth_requestAccounts",
        });
        const sender = accounts[0];
        if (!sender) throw new Error("Wallet not connected.");

        const chainId = await ensureBaseNetwork(provider);
        if (!isBaseChain(chainId)) throw new Error("Connect your wallet to Base.");

        const data = usdcInterface.encodeFunctionData("transfer", [
          resolved.wallet_address,
          amountUnits,
        ]);

        setState("awaiting_wallet");
        const hash = await provider.request<string>({
          method: "eth_sendTransaction",
          params: [
            {
              from: sender,
              to: BASE_USDC.contractAddress,
              value: "0x0",
              data,
              chainId: BASE_CHAIN_HEX,
            },
          ],
        });

        setTxHash(hash);
        setState("submitted");
        const receipt = await waitForReceipt(provider, hash);
        if (!receipt) return;
        setState(receipt.status === "0x1" ? "success" : "failed");
        if (receipt.status !== "0x1") {
          setError("Transaction was submitted but failed onchain.");
        }
      } catch (err) {
        setState("failed");
        const message = err instanceof Error ? err.message : "Transaction failed.";
        setError(
          /reject|denied|cancel/i.test(message)
            ? "Transaction rejected in wallet."
            : message
        );
      }
    });
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 transition-colors dark:bg-zinc-950 dark:text-zinc-50">
      <AppPageHeader ctaHref="/dashboard" ctaLabel="Dashboard" />

      <main className="py-6 sm:py-8">
        <Container className="max-w-5xl space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="flex flex-wrap gap-2">
                <Badge tone="orange">Crypto send</Badge>
                <Badge tone="neutral">Base</Badge>
                <Badge tone="neutral">USDC</Badge>
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-4xl">
                Send USDC to a NairaTag handle.
              </h1>
            </div>
            <Badge tone={toneForState(state)}>{statusLabel(state)}</Badge>
          </div>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <Card className="p-5 sm:p-6">
              <form onSubmit={resolveRecipient} className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_12rem]">
                  <label className="block">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-500 dark:text-zinc-400">
                      Recipient
                    </span>
                    <div className="mt-2 flex rounded-2xl border border-zinc-200/80 bg-white/85 text-sm dark:border-zinc-800/80 dark:bg-zinc-950/40">
                      <span className="grid w-11 place-items-center border-r border-zinc-200/70 text-zinc-500 dark:border-zinc-800/70">
                        {NAIRA}
                      </span>
                      <input
                        value={handle}
                        onChange={(event) => {
                          setHandle(event.target.value);
                          setResolved(null);
                          setState("idle");
                        }}
                        placeholder="femi or vitalik.eth"
                        className="min-w-0 flex-1 bg-transparent px-4 py-3 font-semibold text-zinc-950 outline-none placeholder:text-zinc-400 dark:text-zinc-50"
                      />
                    </div>
                  </label>

                  <label className="block">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-500 dark:text-zinc-400">
                      Amount
                    </span>
                    <div className="mt-2 flex rounded-2xl border border-zinc-200/80 bg-white/85 text-sm dark:border-zinc-800/80 dark:bg-zinc-950/40">
                      <input
                        value={amount}
                        onChange={(event) => {
                          setAmount(event.target.value.replace(/[^\d.]/g, ""));
                          setResolved(null);
                          setState("idle");
                        }}
                        inputMode="decimal"
                        placeholder="10"
                        className="min-w-0 flex-1 bg-transparent px-4 py-3 font-semibold text-zinc-950 outline-none placeholder:text-zinc-400 dark:text-zinc-50"
                      />
                      <span className="grid w-16 place-items-center border-l border-zinc-200/70 text-xs font-semibold text-zinc-500 dark:border-zinc-800/70">
                        USDC
                      </span>
                    </div>
                  </label>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="submit"
                    disabled={!canResolve || isPending}
                    className="h-10 rounded-xl bg-nt-orange px-4 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {state === "resolving" ? "Resolving" : "Resolve handle"}
                  </button>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">
                    Network: Base · Asset: USDC
                  </div>
                </div>
              </form>

              {resolved ? (
                <div className="mt-5 rounded-2xl border border-zinc-200/75 bg-zinc-50/85 p-4 dark:border-zinc-800/80 dark:bg-zinc-900/35">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.1em] text-zinc-500 dark:text-zinc-400">
                        Confirmation
                      </div>
                      <div className="mt-2 text-xl font-semibold text-zinc-950 dark:text-zinc-50">
                        Send {amount} USDC to {resolved.display_handle}
                      </div>
                      <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                        Recipient wallet: {maskAddress(resolved.wallet_address)}
                      </div>
                    </div>
                    <Badge tone="verify">Verified wallet</Badge>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-zinc-200/70 bg-white/80 p-3 dark:border-zinc-800/70 dark:bg-zinc-950/35">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-500">
                        Network
                      </div>
                      <div className="mt-1 text-sm font-semibold">Base</div>
                    </div>
                    <div className="rounded-xl border border-zinc-200/70 bg-white/80 p-3 dark:border-zinc-800/70 dark:bg-zinc-950/35">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-500">
                        Token
                      </div>
                      <div className="mt-1 text-sm font-semibold">USDC</div>
                    </div>
                    <div className="rounded-xl border border-zinc-200/70 bg-white/80 p-3 dark:border-zinc-800/70 dark:bg-zinc-950/35">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-500">
                        Source
                      </div>
                      <div className="mt-1 text-sm font-semibold">
                        {cryptoResolutionSourceLabel(resolved.resolution_source)}
                      </div>
                    </div>
                  </div>

                  {resolved.resolved_name ? (
                    <div className="mt-4 rounded-xl border border-zinc-200/70 bg-white/80 p-3 dark:border-zinc-800/70 dark:bg-zinc-950/35">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-500">
                        ENS execution name
                      </div>
                      <div className="mt-1 text-sm font-semibold">
                        {resolved.resolved_name}
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={sendUsdc}
                      disabled={!canSend || state === "submitted" || state === "success"}
                      className="h-10 rounded-xl bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                    >
                      {state === "awaiting_wallet" ? "Confirm in wallet" : "Send USDC"}
                    </button>
                    {txHash ? (
                      <a
                        href={`https://basescan.org/tx/${txHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-10 items-center rounded-xl border border-zinc-300/70 bg-white/75 px-4 text-sm font-semibold text-zinc-950 transition hover:bg-white dark:border-zinc-700/80 dark:bg-zinc-950/30 dark:text-zinc-50"
                      >
                        View transaction
                      </a>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {error ? (
                <div className="mt-4 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-900 dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-100">
                  {error}
                </div>
              ) : null}
            </Card>

            <aside className="space-y-4">
              <Card className="p-5">
                <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                  Transaction states
                </div>
                <div className="mt-4 space-y-2">
                  {[
                    "Resolving handle",
                    "Preparing",
                    "Awaiting wallet confirmation",
                    "Submitted",
                    "Success",
                  ].map((label) => (
                    <div
                      key={label}
                      className={cn(
                        "rounded-xl border px-3 py-2 text-xs font-semibold",
                        statusLabel(state) === label
                          ? "border-orange-200 bg-orange-50 text-orange-900 dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-100"
                          : "border-zinc-200/70 bg-white/70 text-zinc-600 dark:border-zinc-800/70 dark:bg-zinc-950/30 dark:text-zinc-300"
                      )}
                    >
                      {label}
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-5">
                <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                  V1 scope
                </div>
                <div className="mt-3 space-y-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                  <p>Only Base USDC is supported.</p>
                  <p>Funds move directly from sender wallet to receiver wallet.</p>
                  <p>Direct wallet routing stays first priority.</p>
                  <p>ENS subnames and raw ENS names can execute when configured and resolvable.</p>
                </div>
                <div className="mt-4">
                  <Link
                    href="/dashboard"
                    className="text-sm font-semibold text-nt-orange hover:underline"
                  >
                    Link your receiving wallet
                  </Link>
                </div>
              </Card>
            </aside>
          </div>
        </Container>
      </main>
    </div>
  );
}
