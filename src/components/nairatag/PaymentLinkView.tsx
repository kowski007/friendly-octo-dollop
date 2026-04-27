"use client";

import Link from "next/link";
import { Interface, parseUnits } from "ethers";
import { useEffect, useMemo, useState, useTransition } from "react";

import type {
  BankAccountRecord,
  ClaimRecord,
  CreditProfile,
  HandleReputation,
  PublicHandleSuggestion,
} from "@/lib/adminTypes";
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
import { CopyButton } from "./CopyButton";
import {
  BadgeLegend,
  HandleIdentity,
  SuggestedHandlesSection,
  VerificationChecklist,
} from "./HandleTrust";
import { Badge, ButtonLink, Card, Container, cn } from "./ui";

const NAIRA = "\u20A6";
const usdcInterface = new Interface([
  "function transfer(address to, uint256 amount) returns (bool)",
]);

type PaymentMethod = "fiat" | "crypto";
type TxState =
  | "idle"
  | "resolving"
  | "ready"
  | "preparing"
  | "awaiting_wallet"
  | "submitted"
  | "success"
  | "failed";

type EthereumProvider = {
  request<T = unknown>(args: { method: string; params?: unknown[] | object }): Promise<T>;
};

type PublicBankAccount = BankAccountRecord & {
  accountNumber: string;
};

type TransactionReceipt = {
  status?: string;
};

function formatCurrency(amount: number | null) {
  if (amount === null) return null;
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatAmount(input?: string) {
  if (!input) return null;
  const value = Number(input);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(value);
}

function formatCryptoAmount(input?: string) {
  const value = input?.trim();
  if (!value || !/^\d+(\.\d{1,6})?$/.test(value)) return "";
  if (Number(value) <= 0) return "";
  return value;
}

function formatCompactCurrency(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount);
}

function trustTone(score: number) {
  if (score >= 75) return "verify";
  if (score >= 50) return "orange";
  return "neutral";
}

function presentRecipientName(claim: ClaimRecord | null, fallbackHandle: string) {
  if (!claim) return `${NAIRA}${fallbackHandle}`;
  const name = claim.displayName.trim();
  if (!name || /^pending verification$/i.test(name)) return `${NAIRA}${fallbackHandle}`;
  return name;
}

function maskAddress(value: string) {
  return value.length <= 12 ? value : `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function getProvider() {
  return window.ethereum as EthereumProvider | undefined;
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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForReceipt(provider: EthereumProvider, txHash: string) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const receipt = await provider.request<TransactionReceipt | null>({
      method: "eth_getTransactionReceipt",
      params: [txHash],
    });
    if (receipt) return receipt;
    await sleep(3000);
  }
  return null;
}

function txLabel(state: TxState) {
  switch (state) {
    case "resolving":
      return "Checking details";
    case "ready":
      return "Ready";
    case "preparing":
      return "Preparing";
    case "awaiting_wallet":
      return "Awaiting wallet";
    case "submitted":
      return "Processing on Base";
    case "success":
      return "Payment sent";
    case "failed":
      return "Payment failed";
    default:
      return "Not started";
  }
}

function PaymentTabs({
  method,
  onChange,
}: {
  method: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
}) {
  return (
    <div className="grid grid-cols-2 rounded-2xl border border-zinc-200/80 bg-white p-1 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-950">
      {(["fiat", "crypto"] as const).map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => onChange(item)}
          className={cn(
            "h-12 rounded-xl text-sm font-semibold transition",
            method === item
              ? "bg-violet-600 text-white shadow-sm"
              : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-900"
          )}
        >
          {item === "fiat" ? "Fiat" : "Crypto"}
        </button>
      ))}
    </div>
  );
}

function ProgressSteps({ state }: { state: TxState }) {
  const steps = [
    ["preparing", "Preparing"],
    ["awaiting_wallet", "Awaiting wallet"],
    ["submitted", "Processing"],
    ["success", "Complete"],
  ] as const;
  const activeIndex = Math.max(
    0,
    steps.findIndex(([key]) => key === state)
  );

  return (
    <div className="grid grid-cols-4 gap-2 rounded-2xl border border-zinc-200/70 bg-zinc-50 p-3 dark:border-zinc-800/80 dark:bg-zinc-900/35">
      {steps.map(([, label], index) => (
        <div key={label} className="min-w-0">
          <div
            className={cn(
              "mx-auto h-2 rounded-full",
              state === "failed"
                ? "bg-orange-500"
                : index <= activeIndex && state !== "idle"
                  ? "bg-violet-600"
                  : "bg-zinc-200 dark:bg-zinc-800"
            )}
          />
          <div className="mt-2 truncate text-center text-[10px] font-semibold text-zinc-500 dark:text-zinc-400">
            {label}
          </div>
        </div>
      ))}
    </div>
  );
}

function FiatPaymentCard({
  claim,
  bankAccount,
  recipientName,
  requestedAmount,
  note,
  shareUrl,
}: {
  claim: ClaimRecord;
  bankAccount: PublicBankAccount | null;
  recipientName: string;
  requestedAmount: number | null;
  note?: string;
  shareUrl: string;
}) {
  const [customAmount, setCustomAmount] = useState(
    requestedAmount ? String(requestedAmount) : ""
  );
  const [senderName, setSenderName] = useState("");
  const [senderPhone, setSenderPhone] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitMessage, setSubmitMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setCustomAmount(requestedAmount ? String(requestedAmount) : "");
  }, [requestedAmount]);

  const resolvedAmount = requestedAmount ?? formatAmount(customAmount);
  const resolvedAmountLabel = formatCurrency(resolvedAmount);

  function reportPayment() {
    setSubmitError("");
    setSubmitMessage("");

    if (!bankAccount) {
      setSubmitError("This pay page does not have a published bank destination yet.");
      return;
    }

    if (!resolvedAmount) {
      setSubmitError("Enter the amount you transferred.");
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch("/api/transactions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-store",
          },
          body: JSON.stringify({
            handle: claim.handle,
            amount: resolvedAmount,
            status: "pending",
            channel: "payment_link",
            reference: `paylink_${claim.handle}_${Date.now().toString(36)}`,
            note: note?.trim()
              ? `PayLink report: ${note.trim()}`
              : "PayLink report",
            senderName: senderName.trim() || undefined,
            senderPhone: senderPhone.trim() || undefined,
          }),
        });

        const body = (await response.json().catch(() => null)) as
          | { error?: string }
          | { ok?: boolean; transaction?: { id?: string } }
          | null;

        if (!response.ok) {
          throw new Error(body && "error" in body && body.error ? body.error : "Unable to record payment.");
        }

        setSubmitMessage(
          "Transfer recorded. The recipient and admin dashboard can see it now."
        );
      } catch (error) {
        setSubmitError(
          error instanceof Error ? error.message : "Unable to record payment."
        );
      }
    });
  }

  return (
    <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-950/50">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
            Pay via Bank Transfer
          </div>
          <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            {claim.bank}
          </div>
        </div>
        <Badge tone={bankAccount ? "verify" : "orange"} className="px-2 py-0.5 text-[11px]">
          {bankAccount ? "Recommended" : "Needs bank"}
        </Badge>
      </div>

      <div className="mt-5 space-y-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-500">
            Account Number
          </div>
          <div className="mt-1 flex items-center justify-between gap-3 text-2xl font-semibold tracking-tight">
            <span>{bankAccount?.accountNumber ?? "Not published"}</span>
            {bankAccount?.accountNumber ? (
              <CopyButton
                value={bankAccount.accountNumber}
                label="Copy"
                copiedLabel="Copied"
                className="h-9 px-3 py-0 text-xs"
              />
            ) : null}
          </div>
        </div>
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-500">
            Account Name
          </div>
          <div className="mt-1 text-sm font-semibold text-zinc-950 dark:text-zinc-50">
            {bankAccount?.accountName ?? recipientName}
          </div>
        </div>
        <div className="border-t border-zinc-200/70 pt-4 dark:border-zinc-800/80">
          <div className="flex items-end justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-500">
                You are paying
              </div>
              <div className="mt-1 text-2xl font-semibold tracking-tight">
                {resolvedAmountLabel ?? "Flexible"}
              </div>
              {note ? <div className="mt-1 text-xs text-zinc-500">{note}</div> : null}
            </div>
            <Link
              href="/paylink"
              className="text-xs font-semibold text-violet-600 hover:underline"
            >
              Change
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {requestedAmount === null ? (
          <label className="block sm:col-span-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-500">
              Amount transferred
            </span>
            <input
              value={customAmount}
              onChange={(event) => {
                setCustomAmount(event.target.value.replace(/[^\d]/g, ""));
                setSubmitError("");
                setSubmitMessage("");
              }}
              inputMode="numeric"
              placeholder="5000"
              className="mt-2 h-11 w-full rounded-xl border border-zinc-200/80 bg-white/85 px-3 text-sm font-semibold text-zinc-950 outline-none placeholder:text-zinc-400 dark:border-zinc-800/80 dark:bg-zinc-950/40 dark:text-zinc-50"
            />
          </label>
        ) : null}

        <label className="block">
          <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-500">
            Your name
          </span>
          <input
            value={senderName}
            onChange={(event) => {
              setSenderName(event.target.value);
              setSubmitError("");
              setSubmitMessage("");
            }}
            placeholder="Optional"
            className="mt-2 h-11 w-full rounded-xl border border-zinc-200/80 bg-white/85 px-3 text-sm font-semibold text-zinc-950 outline-none placeholder:text-zinc-400 dark:border-zinc-800/80 dark:bg-zinc-950/40 dark:text-zinc-50"
          />
        </label>

        <label className="block">
          <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-500">
            Phone
          </span>
          <input
            value={senderPhone}
            onChange={(event) => {
              setSenderPhone(event.target.value);
              setSubmitError("");
              setSubmitMessage("");
            }}
            inputMode="tel"
            placeholder="Optional"
            className="mt-2 h-11 w-full rounded-xl border border-zinc-200/80 bg-white/85 px-3 text-sm font-semibold text-zinc-950 outline-none placeholder:text-zinc-400 dark:border-zinc-800/80 dark:bg-zinc-950/40 dark:text-zinc-50"
          />
        </label>
      </div>

      {submitError ? (
        <div className="mt-4 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-900 dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-100">
          {submitError}
        </div>
      ) : null}

      {submitMessage ? (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-100">
          {submitMessage}
        </div>
      ) : null}

      <div className="mt-5 grid grid-cols-2 gap-3">
        <CopyButton
          value={bankAccount?.accountNumber ?? shareUrl}
          label={bankAccount ? "Copy Details" : "Copy Link"}
          copiedLabel="Copied"
          className="h-11 justify-center rounded-xl px-3 py-0 text-xs"
        />
        <button
          type="button"
          onClick={reportPayment}
          disabled={!bankAccount || isPending}
          className="h-11 rounded-xl bg-violet-600 px-3 text-xs font-semibold text-white shadow-sm transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Recording" : "I've Paid"}
        </button>
      </div>
    </div>
  );
}

function CryptoPaymentCard({
  claim,
  amount,
}: {
  claim: ClaimRecord;
  amount: string;
}) {
  const [resolved, setResolved] = useState<CryptoResolveSuccess | null>(null);
  const [state, setState] = useState<TxState>("idle");
  const [error, setError] = useState("");
  const [txHash, setTxHash] = useState("");
  const [isPending, startTransition] = useTransition();

  const amountUnits = useMemo(() => {
    if (!amount) return null;
    try {
      return parseUnits(amount, BASE_USDC.decimals);
    } catch {
      return null;
    }
  }, [amount]);

  useEffect(() => {
    let cancelled = false;
    setError("");
    setResolved(null);
    setTxHash("");

    async function resolve() {
      try {
        setState("resolving");
        const params = new URLSearchParams({
          handle: claim.handle,
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
              : "Crypto payments are not available for this handle yet."
          );
        }
        if (!cancelled) {
          setResolved(body);
          setState("ready");
        }
      } catch (err) {
        if (!cancelled) {
          setState("failed");
          setError(err instanceof Error ? err.message : "Unable to load crypto payment.");
        }
      }
    }

    void resolve();
    return () => {
      cancelled = true;
    };
  }, [claim.handle]);

  function sendCrypto() {
    setError("");
    setTxHash("");

    const provider = getProvider();
    if (!provider) {
      setState("failed");
      setError("Connect an EVM wallet to pay with USDC.");
      return;
    }
    if (!resolved || !amountUnits) {
      setState("failed");
      setError("Enter a valid USDC amount.");
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
        if (!isBaseChain(chainId)) throw new Error("Switch your wallet to Base.");

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
        if (receipt.status !== "0x1") setError("Payment failed on Base.");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Payment failed.";
        setState("failed");
        setError(/reject|denied|cancel/i.test(message) ? "Payment rejected in wallet." : message);
      }
    });
  }

  return (
    <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-950/50">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
            Pay with Crypto
          </div>
          <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            USDC on Base
          </div>
        </div>
        <Badge tone={state === "success" ? "verify" : state === "failed" ? "orange" : "neutral"} className="px-2 py-0.5 text-[11px]">
          {txLabel(state)}
        </Badge>
      </div>

      <div className="mt-5 grid gap-4">
        <div className="flex items-center justify-between gap-4 border-b border-zinc-200/70 pb-4 dark:border-zinc-800/80">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-500">
              You will send
            </div>
            <div className="mt-1 text-2xl font-semibold tracking-tight">
              {amount || "0"} USDC
            </div>
          </div>
          <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50 px-3 py-2 text-right dark:border-zinc-800 dark:bg-zinc-900">
            <div className="text-[10px] font-semibold text-zinc-500">Network</div>
            <div className="text-sm font-semibold">Base</div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-500">
              Recipient
            </div>
            <div className="mt-1 text-xl font-semibold tracking-tight">{NAIRA}{claim.handle}</div>
            <div className="mt-1 truncate text-sm text-zinc-500">
              {resolved ? maskAddress(resolved.wallet_address) : "Checking crypto destination"}
            </div>
            {resolved?.resolved_name ? (
              <div className="mt-1 truncate text-xs font-semibold text-zinc-500">
                {cryptoResolutionSourceLabel(resolved.resolution_source)}: {resolved.resolved_name}
              </div>
            ) : resolved ? (
              <div className="mt-1 truncate text-xs font-semibold text-zinc-500">
                {cryptoResolutionSourceLabel(resolved.resolution_source)}
              </div>
            ) : null}
          </div>
          {resolved ? (
            <CopyButton
              value={resolved.wallet_address}
              label="Copy"
              copiedLabel="Copied"
              className="h-9 px-3 py-0 text-xs"
            />
          ) : null}
        </div>

        <ProgressSteps state={state} />
      </div>

      {error ? (
        <div className="mt-4 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-900 dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-100">
          {error}
        </div>
      ) : null}

      <div className="mt-5 grid gap-3">
        <button
          type="button"
          onClick={sendCrypto}
          disabled={!resolved || !amountUnits || isPending || state === "success" || state === "submitted"}
          className="h-12 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {state === "awaiting_wallet"
            ? "Confirm in wallet"
            : resolved
              ? `Pay ${amount || "0"} USDC`
              : "Connect Wallet"}
        </button>
        {txHash ? (
          <a
            href={`https://basescan.org/tx/${txHash}`}
            target="_blank"
            rel="noreferrer"
            className="text-center text-xs font-semibold text-violet-600 hover:underline"
          >
            View transaction
          </a>
        ) : null}
      </div>
    </div>
  );
}

export function PaymentLinkView({
  handle,
  payment,
  reputation,
  creditProfile,
  requestedAmount,
  cryptoAmount,
  initialMethod = "fiat",
  note,
  shareUrl,
  suggestions,
}: {
  handle: string;
  payment: {
    claim: ClaimRecord;
    bankAccount: PublicBankAccount | null;
  } | null;
  reputation: HandleReputation | null;
  creditProfile: CreditProfile | null;
  requestedAmount: number | null;
  cryptoAmount?: string;
  initialMethod?: PaymentMethod;
  note?: string;
  shareUrl: string;
  suggestions: PublicHandleSuggestion[];
}) {
  const [method, setMethod] = useState<PaymentMethod>(initialMethod);
  const claim = payment?.claim ?? null;
  const bankAccount = payment?.bankAccount ?? null;
  const amountLabel = formatCurrency(requestedAmount);
  const recipientName = presentRecipientName(claim, handle);
  const trustScore = reputation?.trustScore ?? 12;
  const cryptoDisplayAmount = cryptoAmount || (requestedAmount ? String(requestedAmount) : "");

  return (
    <div className="min-h-screen bg-[#f8fafc] text-zinc-950 transition-colors dark:bg-[#0c101b] dark:text-zinc-50">
      <AppPageHeader ctaHref="/marketplace" ctaLabel="Explore handles" />

      <main className="py-6 sm:py-10">
        <Container className="max-w-5xl">
          {!claim ? (
            <div className="space-y-6">
              <Card className="p-6 sm:p-7">
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="orange">Payment link</Badge>
                    <Badge tone="neutral">Handle not claimed</Badge>
                  </div>
                  <div>
                    <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                      {NAIRA}{handle} is still available
                    </h1>
                    <p className="mt-3 max-w-2xl text-base leading-7 text-zinc-600 dark:text-zinc-300">
                      There is no verified destination behind this handle yet. Claim it first before using it for payments.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <ButtonLink href="/claim">Claim this ₦handle</ButtonLink>
                    <ButtonLink href="/" variant="secondary">Back home</ButtonLink>
                  </div>
                </div>
              </Card>

              <SuggestedHandlesSection
                items={suggestions}
                mode="pay"
                title="Try these verified handles instead"
                description="These nearby handles are already live or verified, so visitors are not left at a dead end."
              />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="mx-auto grid max-w-5xl gap-5 lg:grid-cols-[22rem_minmax(0,1fr)]">
                <aside className="space-y-4">
                <div className="rounded-3xl border border-zinc-200/80 bg-white p-5 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-950/60">
                  <div className="flex items-start gap-4">
                    <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-violet-600 text-3xl font-bold text-white shadow-lg shadow-violet-600/25">
                      {NAIRA}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={trustTone(trustScore)} className="px-2 py-0.5 text-[11px]">
                          Trust {trustScore}
                        </Badge>
                      </div>
                      <HandleIdentity
                        handle={claim.handle}
                        verification={claim.verification}
                        className="mt-3"
                      />
                      <p className="mt-1 truncate text-sm text-zinc-600 dark:text-zinc-300">
                        {recipientName}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 rounded-2xl border border-zinc-200/75 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-500">
                      Amount
                    </div>
                    <div className="mt-2 text-3xl font-semibold tracking-tight">
                      {method === "crypto"
                        ? `${cryptoDisplayAmount || "10"} USDC`
                        : amountLabel ?? "Flexible"}
                    </div>
                    <div className="mt-1 text-sm text-zinc-500">
                      {method === "crypto" ? "USDC on Base" : "Bank transfer / Fiat"}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {(reputation?.badges.length ? reputation.badges : ["New handle"]).slice(0, 3).map((badge) => (
                      <Badge key={badge} tone="neutral" className="px-2 py-0.5 text-[11px]">
                        {badge}
                      </Badge>
                    ))}
                    {creditProfile ? (
                      <Badge tone="verify" className="px-2 py-0.5 text-[11px]">
                        {formatCompactCurrency(creditProfile.recommendedLimit)} limit
                      </Badge>
                    ) : null}
                  </div>
                </div>

                <PaymentTabs method={method} onChange={setMethod} />
                <CopyButton
                  value={shareUrl}
                  label="Copy payment link"
                  copiedLabel="Link copied"
                  className="h-11 w-full justify-center rounded-xl px-3 py-0 text-xs"
                />
                </aside>

                <section>
                  {method === "fiat" ? (
                    <FiatPaymentCard
                      claim={claim}
                      bankAccount={bankAccount}
                      recipientName={recipientName}
                      requestedAmount={requestedAmount}
                      note={note}
                      shareUrl={shareUrl}
                    />
                  ) : (
                    <CryptoPaymentCard claim={claim} amount={cryptoDisplayAmount || "10"} />
                  )}
                </section>
              </div>

              <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
                <VerificationChecklist
                  title="Verification checklist"
                  description="Show visitors why this pay page is safe enough to use before they continue to transfer or send USDC."
                  items={[
                    {
                      label: "Handle claimed",
                      detail: `${NAIRA}${claim.handle} is reserved to one owner inside NairaTag.`,
                      done: true,
                    },
                    {
                      label: "Identity verification",
                      detail:
                        claim.verification === "pending"
                          ? "Identity checks are still in progress."
                          : "Identity checks passed for this handle.",
                      done: claim.verification !== "pending",
                    },
                    {
                      label: "Payout destination verified",
                      detail: bankAccount
                        ? `${bankAccount.bankName} is connected as the payout route.`
                        : "A payout destination is not published yet.",
                      done: bankAccount?.status === "verified",
                    },
                    {
                      label: "Trust signals available",
                      detail:
                        (reputation?.settledTransactionCount ?? 0) > 0
                          ? `${reputation?.settledTransactionCount ?? 0} settled payment signal(s) are already visible.`
                          : "Settled history is still being built.",
                      done: (reputation?.settledTransactionCount ?? 0) > 0,
                    },
                  ]}
                />

                <BadgeLegend />
              </div>

              <SuggestedHandlesSection
                items={suggestions}
                mode="pay"
                title="Suggested handles"
                description="Visitors can keep moving if they want a similar verified handle or live listing next."
              />
            </div>
          )}
        </Container>
      </main>
    </div>
  );
}

export { formatAmount, formatCryptoAmount };
