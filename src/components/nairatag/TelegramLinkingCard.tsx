"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import type { ClaimRecord } from "@/lib/adminTypes";
import { CopyButton } from "./CopyButton";
import { useToast } from "./ToastProvider";
import { Badge, cn } from "./ui";

type TelegramInstruction = {
  required: true;
  method: "bot_message";
  code: string;
  instruction: string;
  help: string;
  expiresAt: string;
  botUsername: string;
  deepLink: string;
};

type TelegramSocial = {
  id: string;
  handle: string;
  username: string;
  verified: boolean;
  verifiedAt?: string;
  ensSynced: boolean;
  ensSyncedAt?: string;
  status: "active" | "deleted";
  createdAt: string;
  updatedAt: string;
  instruction: TelegramInstruction | null;
};

type TelegramEnsSync = {
  socialId: string;
  handle: string;
  ensName: string | null;
  key: string;
  expectedValue: string;
  currentValue: string | null;
  chainId: number;
  linkedWalletAddress: string | null;
  ownerAddress: string | null;
  resolverAddress: string | null;
  verified: boolean;
  ensSynced: boolean;
  ensSyncedAt?: string;
  ensTxHash?: string;
  canPrepareTransaction: boolean;
  reason:
    | "ready"
    | "already_synced"
    | "ens_parent_not_configured"
    | "telegram_not_verified"
    | "wallet_required"
    | "ens_name_missing"
    | "ens_resolver_missing"
    | "ens_text_not_supported"
    | "ens_owner_wallet_mismatch";
};

type EthereumProvider = {
  request<T = unknown>(args: { method: string; params?: unknown[] | object }): Promise<T>;
};

function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={cn("h-5 w-5", className)}
      aria-hidden="true"
    >
      <path
        d="m20.5 4.6-2.8 13.1c-.2.9-.8 1.1-1.6.7l-4.2-3.1-2 1.9c-.2.2-.4.4-.8.4l.3-4.4 8-7.2c.4-.3-.1-.5-.5-.2l-9.9 6.2-4.2-1.3c-.9-.3-.9-.9.2-1.3l16.4-6.3c.8-.3 1.4.2 1.1 1.5Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function humanizeError(error: string) {
  switch (error) {
    case "handle_not_owned":
      return "Claim a NairaTag handle before linking Telegram.";
    case "telegram_username_claimed":
      return "That Telegram username is already linked to another NairaTag handle.";
    case "invalid_telegram_username":
      return "Enter a valid Telegram username.";
    case "telegram_verification_not_found":
      return "We have not seen that verification message yet. Send it to the bot, then try again.";
    case "verification_code_expired":
      return "That verification code expired. Generate a new Telegram link.";
    case "ens_parent_not_configured":
      return "NairaTag ENS is not configured yet.";
    case "telegram_not_verified":
      return "Verify this Telegram username first.";
    case "wallet_required":
      return "Link the wallet that owns your ENS name before publishing this record.";
    case "ens_name_missing":
      return "Your ENS subname has not been issued yet.";
    case "ens_resolver_missing":
      return "This ENS name does not have a resolver yet.";
    case "ens_text_not_supported":
      return "The current ENS resolver does not support text records.";
    case "ens_owner_wallet_mismatch":
      return "Connect the wallet that owns this ENS name before publishing.";
    case "ens_transaction_sender_mismatch":
      return "The transaction was sent from the wrong wallet.";
    case "ens_transaction_target_mismatch":
      return "The transaction targeted the wrong ENS resolver.";
    case "ens_transaction_failed":
      return "The ENS transaction did not confirm successfully.";
    case "ens_text_mismatch":
      return "The transaction confirmed, but ENS still does not show the expected Telegram value.";
    case "invalid_transaction_hash":
      return "That ENS transaction hash is invalid.";
    default:
      return "Something went wrong. Please try again.";
  }
}

function normalizeTelegramUsername(input: string) {
  return input
    .trim()
    .replace(/^https?:\/\/t\.me\//iu, "")
    .replace(/^t\.me\//iu, "")
    .replace(/^@/u, "")
    .toLowerCase();
}

function formatDate(value?: string) {
  if (!value) return "Not yet";
  return new Date(value).toLocaleString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getProvider() {
  return window.ethereum as EthereumProvider | undefined;
}

function maskAddress(value?: string | null) {
  if (!value) return "Not linked";
  return value.length <= 14 ? value : `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function chainHex(chainId: number) {
  return `0x${chainId.toString(16)}`;
}

function chainLabel(chainId: number) {
  if (chainId === 1) return "Ethereum";
  if (chainId === 11155111) return "Sepolia";
  return `Chain ${chainId}`;
}

async function ensureEnsNetwork(provider: EthereumProvider, chainId: number) {
  const current = await provider.request<string>({ method: "eth_chainId" });
  const target = chainHex(chainId);
  if (current.toLowerCase() === target.toLowerCase()) return current;

  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: target }],
    });
  } catch (error) {
    const code =
      typeof error === "object" && error && "code" in error
        ? Number((error as { code?: number }).code)
        : 0;
    if (code !== 4902) throw error;

    if (chainId === 11155111) {
      await provider.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: target,
            chainName: "Sepolia",
            nativeCurrency: { name: "Sepolia Ether", symbol: "SEP", decimals: 18 },
            rpcUrls: ["https://rpc.sepolia.org"],
            blockExplorerUrls: ["https://sepolia.etherscan.io"],
          },
        ],
      });
    } else {
      throw error;
    }
  }

  return provider.request<string>({ method: "eth_chainId" });
}

export function TelegramLinkingCard({ claim }: { claim: ClaimRecord | null }) {
  const { toast } = useToast();
  const claimHandle = claim?.handle ?? null;
  const [username, setUsername] = useState("");
  const [socials, setSocials] = useState<TelegramSocial[]>([]);
  const [loading, setLoading] = useState(Boolean(claim));
  const [submitting, setSubmitting] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [awaitingTelegram, setAwaitingTelegram] = useState(false);
  const [ensSync, setEnsSync] = useState<TelegramEnsSync | null>(null);
  const [ensLoading, setEnsLoading] = useState(false);
  const [ensPublishing, setEnsPublishing] = useState(false);

  const refresh = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!claimHandle) {
        setLoading(false);
        setSocials([]);
        return [] as TelegramSocial[];
      }

      if (!silent) setLoading(true);
      try {
        const response = await fetch(`/api/handles/${claimHandle}/socials`, {
          headers: { "Cache-Control": "no-store" },
        });
        const body = (await response.json().catch(() => null)) as
          | { ok?: true; socials?: TelegramSocial[]; error?: string }
          | null;
        if (!response.ok || !body?.ok) {
          throw new Error(body?.error || "load_failed");
        }

        const nextSocials = body.socials ?? [];
        setSocials(nextSocials);
        return nextSocials;
      } catch (error) {
        if (!silent) {
          toast({
            title: "Telegram unavailable",
            description: humanizeError(
              error instanceof Error ? error.message : "load_failed"
            ),
            tone: "error",
          });
        }
        if (!silent) setSocials([]);
        return [] as TelegramSocial[];
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [claimHandle, toast]
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const activeSocial = socials[0] ?? null;

  useEffect(() => {
    if (!activeSocial) {
      setAwaitingTelegram(false);
      return;
    }

    if (!activeSocial.verified && activeSocial.instruction) {
      setAwaitingTelegram(true);
      return;
    }

    if (activeSocial.verified && awaitingTelegram) {
      setAwaitingTelegram(false);
      toast({
        title: "Telegram linked",
        description: "Telegram verification was detected automatically. You can publish it to ENS now.",
        tone: "success",
      });
    }
  }, [activeSocial, awaitingTelegram, toast]);

  useEffect(() => {
    if (!claimHandle || !awaitingTelegram || !activeSocial || activeSocial.verified) {
      return;
    }

    const refreshSilently = () => {
      void refresh({ silent: true });
    };

    refreshSilently();
    const intervalId = window.setInterval(refreshSilently, 3500);
    const handleFocus = () => {
      refreshSilently();
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleFocus);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleFocus);
    };
  }, [claimHandle, awaitingTelegram, activeSocial, refresh]);

  const loadEnsSync = useCallback(
    async (socialId: string) => {
      if (!claimHandle) return;
      setEnsLoading(true);
      try {
        const response = await fetch(
          `/api/handles/${claimHandle}/socials/${socialId}/ens`,
          {
            headers: { "Cache-Control": "no-store" },
          }
        );
        const body = (await response.json().catch(() => null)) as
          | { ok?: true; sync?: TelegramEnsSync; error?: string }
          | null;
        if (!response.ok || !body?.ok || !body.sync) {
          throw new Error(body?.error || "ens_sync_failed");
        }
        setEnsSync(body.sync);
      } catch (error) {
        setEnsSync(null);
        toast({
          title: "ENS status unavailable",
          description: humanizeError(
            error instanceof Error ? error.message : "ens_sync_failed"
          ),
          tone: "error",
        });
      } finally {
        setEnsLoading(false);
      }
    },
    [claimHandle, toast]
  );

  useEffect(() => {
    if (!activeSocial?.verified) {
      setEnsSync(null);
      setEnsLoading(false);
      return;
    }

    void loadEnsSync(activeSocial.id);
  }, [activeSocial?.id, activeSocial?.verified, loadEnsSync]);

  async function submitLink() {
    if (!claimHandle) return;
    setSubmitting(true);
    try {
      const response = await fetch(`/api/handles/${claimHandle}/socials`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
        body: JSON.stringify({
          platform: "telegram",
          username,
        }),
      });
      const body = (await response.json().catch(() => null)) as
        | { ok?: true; social?: TelegramSocial; error?: string }
        | null;
      if (!response.ok || !body?.ok) {
        throw new Error(body?.error || "link_failed");
      }

      setUsername("");
      setSocials(body.social ? [body.social] : []);
      setEnsSync(null);
      setAwaitingTelegram(true);
      toast({
        title: "Telegram linked",
        description: "Open Telegram and finish the bot step. This page will detect it automatically when you come back.",
        tone: "success",
      });
    } catch (error) {
      toast({
        title: "Link failed",
        description: humanizeError(
          error instanceof Error ? error.message : "link_failed"
        ),
        tone: "error",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function unlinkSocial(socialId: string) {
    if (!claimHandle) return;
    setRemoving(socialId);
    try {
      const response = await fetch(`/api/handles/${claimHandle}/socials/${socialId}`, {
        method: "DELETE",
        headers: { "Cache-Control": "no-store" },
      });
      const body = (await response.json().catch(() => null)) as
        | { ok?: true; error?: string }
        | null;
      if (!response.ok || !body?.ok) {
        throw new Error(body?.error || "unlink_failed");
      }

      toast({
        title: "Telegram unlinked",
        description: "That Telegram alias no longer resolves to your handle.",
        tone: "success",
      });
      setAwaitingTelegram(false);
      await refresh();
    } catch (error) {
      toast({
        title: "Unlink failed",
        description: humanizeError(
          error instanceof Error ? error.message : "unlink_failed"
        ),
        tone: "error",
      });
    } finally {
      setRemoving(null);
    }
  }

  async function publishToEns() {
    if (!claimHandle || !activeSocial?.verified) return;
    setEnsPublishing(true);

    try {
      const provider = getProvider();
      if (!provider) {
        throw new Error("wallet_required");
      }

      const prepareResponse = await fetch(
        `/api/handles/${claimHandle}/socials/${activeSocial.id}/ens/prepare`,
        {
          method: "POST",
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
      const prepared = (await prepareResponse.json().catch(() => null)) as
        | {
            ok?: true;
            sync?: TelegramEnsSync;
            transaction?: {
              chainId: number;
              resolverAddress: string;
              data: string;
              ownerAddress: string | null;
            };
            error?: string;
          }
        | null;

      if (!prepareResponse.ok || !prepared?.ok || !prepared.transaction || !prepared.sync) {
        throw new Error(prepared?.error || "ens_sync_prepare_failed");
      }

      const accounts = await provider.request<string[]>({
        method: "eth_requestAccounts",
      });
      const selectedAccount = accounts[0];
      if (!selectedAccount) {
        throw new Error("wallet_required");
      }

      if (
        prepared.sync.ownerAddress &&
        selectedAccount.toLowerCase() !== prepared.sync.ownerAddress.toLowerCase()
      ) {
        throw new Error("ens_owner_wallet_mismatch");
      }

      await ensureEnsNetwork(provider, prepared.transaction.chainId);

      toast({
        title: "Publishing to ENS",
        description: `Approve the ${chainLabel(
          prepared.transaction.chainId
        )} transaction in your wallet to write org.telegram.`,
        tone: "info",
      });

      const txHash = await provider.request<string>({
        method: "eth_sendTransaction",
        params: [
          {
            from: selectedAccount,
            to: prepared.transaction.resolverAddress,
            data: prepared.transaction.data,
          },
        ],
      });

      toast({
        title: "ENS transaction submitted",
        description: "Waiting for onchain confirmation.",
        tone: "info",
      });

      const confirmResponse = await fetch(
        `/api/handles/${claimHandle}/socials/${activeSocial.id}/ens/confirm`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-store",
          },
          body: JSON.stringify({ txHash }),
        }
      );
      const confirmed = (await confirmResponse.json().catch(() => null)) as
        | { ok?: true; status?: TelegramEnsSync; error?: string }
        | null;

      if (!confirmResponse.ok || !confirmed?.ok || !confirmed.status) {
        throw new Error(confirmed?.error || "ens_sync_confirm_failed");
      }

      setEnsSync(confirmed.status);
      await refresh();
      toast({
        title: "Live on ENS",
        description: `${activeSocial.username} is now published on ${confirmed.status.ensName}.`,
        tone: "success",
      });
    } catch (error) {
      toast({
        title: "ENS publish failed",
        description: humanizeError(
          error instanceof Error ? error.message : "ens_sync_failed"
        ),
        tone: "error",
      });
    } finally {
      setEnsPublishing(false);
    }
  }

  if (!claim) {
    return (
      <section
        id="telegram-linking"
        className="rounded-[1.7rem] border border-zinc-200/75 bg-white/90 p-4 shadow-[0_16px_42px_rgba(15,23,42,0.06)] dark:border-zinc-800/80 dark:bg-zinc-950/45 dark:shadow-[0_20px_48px_rgba(0,0,0,0.22)]"
      >
        <div className="flex items-center gap-2 text-base font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          <TelegramIcon className="text-sky-500" />
          Telegram
        </div>
        <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
          Claim your {`\u20A6`}handle first, then link a verified Telegram username to it.
        </p>
        <Link
          href="/claim"
          className="mt-4 inline-flex h-10 items-center justify-center rounded-xl bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
        >
          Claim your handle
        </Link>
      </section>
    );
  }

  return (
    <section
      id="telegram-linking"
      className="rounded-[1.7rem] border border-zinc-200/75 bg-white/90 p-4 shadow-[0_16px_42px_rgba(15,23,42,0.06)] dark:border-zinc-800/80 dark:bg-zinc-950/45 dark:shadow-[0_20px_48px_rgba(0,0,0,0.22)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-base font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            <TelegramIcon className="text-sky-500" />
            Telegram
          </div>
          <p className="mt-1 text-xs leading-5 text-zinc-600 dark:text-zinc-300">
            Link Telegram once, open the bot, then come back here. NairaTag will pick up the verification automatically.
          </p>
        </div>
        <Badge tone={activeSocial?.verified ? "verify" : "neutral"}>
          {activeSocial?.verified ? "Verified alias" : "Telegram alias"}
        </Badge>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
        <div className="rounded-2xl border border-zinc-200/80 bg-white/80 px-3 dark:border-zinc-800/80 dark:bg-zinc-950/40">
          <div className="flex min-h-11 items-center gap-2">
            <span className="text-sm font-semibold text-sky-600">@</span>
            <input
              value={username}
              onChange={(event) => setUsername(normalizeTelegramUsername(event.target.value))}
              placeholder="victorng"
              className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-zinc-950 outline-none placeholder:text-zinc-400 dark:text-zinc-50"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={() => void submitLink()}
          disabled={submitting || !username.trim()}
          className="inline-flex h-11 items-center justify-center rounded-xl bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
        >
          {submitting ? "Linking..." : activeSocial ? "Update Telegram" : "Link Telegram"}
        </button>
      </div>

      {loading ? (
        <div className="mt-4 rounded-2xl border border-zinc-200/75 bg-zinc-50/85 px-4 py-3 text-sm text-zinc-600 dark:border-zinc-800/80 dark:bg-zinc-900/40 dark:text-zinc-300">
          Loading Telegram status...
        </div>
      ) : activeSocial ? (
        <div className="mt-4 rounded-[1.4rem] border border-zinc-200/75 bg-zinc-50/85 p-4 dark:border-zinc-800/80 dark:bg-zinc-900/40">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={activeSocial.verified ? "verify" : "orange"}>
              {activeSocial.verified ? "Verified" : "Pending"}
            </Badge>
            <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
              {activeSocial.username}
            </div>
          </div>

          <div className="mt-3 text-xs leading-5 text-zinc-600 dark:text-zinc-300">
            {activeSocial.verified
              ? `Verified on ${formatDate(activeSocial.verifiedAt)}. Publish this alias to ENS before it becomes public on your ${`\u20A6`}${claim.handle}.`
              : "Finish the Telegram bot step once. This page will update by itself when the bot sees your code."}
          </div>

          {activeSocial.instruction ? (
            <div className="mt-4 space-y-3 rounded-[1.2rem] border border-sky-200/70 bg-sky-50/80 p-3 dark:border-sky-900/60 dark:bg-sky-950/20">
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-sky-700 dark:text-sky-200">
                Finish in Telegram
              </div>
              <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                Open {activeSocial.instruction.botUsername}, send the verification message, then come back here.
              </div>
              <div className="text-xs text-zinc-600 dark:text-zinc-300">
                {activeSocial.instruction.help}
              </div>
              {awaitingTelegram ? (
                <div className="rounded-xl border border-white/70 bg-white/70 px-3 py-2 text-xs font-medium text-sky-800 dark:border-sky-900/50 dark:bg-sky-950/20 dark:text-sky-100">
                  Waiting for Telegram confirmation. You do not need to tap another verify button here.
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <a
                  href={activeSocial.instruction.deepLink}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setAwaitingTelegram(true)}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-300/70 bg-white/80 px-4 text-xs font-semibold text-zinc-950 transition hover:bg-white dark:border-zinc-700/80 dark:bg-zinc-950/30 dark:text-zinc-50"
                >
                  Open Telegram and finish
                </a>
                <CopyButton
                  value={`verify ${activeSocial.instruction.code}`}
                  label="Copy message"
                  copiedLabel="Message copied"
                />
                <button
                  type="button"
                  onClick={() => void refresh({ silent: true })}
                  className="inline-flex h-10 items-center justify-center rounded-xl bg-zinc-950 px-4 text-xs font-semibold text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                >
                  Check now
                </button>
              </div>
            </div>
          ) : null}

          {activeSocial.verified ? (
            <div className="mt-4 rounded-[1.2rem] border border-emerald-200/70 bg-emerald-50/75 p-3 dark:border-emerald-900/60 dark:bg-emerald-950/20">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-200">
                  ENS publish
                </div>
                <Badge tone={ensSync?.ensSynced ? "verify" : "neutral"}>
                  {ensSync?.ensSynced ? "Live on ENS" : "Awaiting ENS sync"}
                </Badge>
              </div>

              {ensLoading ? (
                <div className="mt-3 text-xs text-zinc-600 dark:text-zinc-300">
                  Checking ENS ownership and resolver state...
                </div>
              ) : ensSync ? (
                <>
                  <div className="mt-3 grid gap-2 text-xs text-zinc-600 dark:text-zinc-300 sm:grid-cols-2">
                    <div>
                      <div className="font-semibold text-zinc-950 dark:text-zinc-50">
                        ENS name
                      </div>
                      <div>{ensSync.ensName ?? "Not configured"}</div>
                    </div>
                    <div>
                      <div className="font-semibold text-zinc-950 dark:text-zinc-50">
                        Record
                      </div>
                      <div>
                        {ensSync.key} = {ensSync.expectedValue}
                      </div>
                    </div>
                    <div>
                      <div className="font-semibold text-zinc-950 dark:text-zinc-50">
                        Linked wallet
                      </div>
                      <div>{maskAddress(ensSync.linkedWalletAddress)}</div>
                    </div>
                    <div>
                      <div className="font-semibold text-zinc-950 dark:text-zinc-50">
                        ENS owner
                      </div>
                      <div>{maskAddress(ensSync.ownerAddress)}</div>
                    </div>
                  </div>

                  <div className="mt-3 rounded-xl border border-white/60 bg-white/75 px-3 py-2 text-xs text-zinc-700 dark:border-zinc-800/70 dark:bg-zinc-950/30 dark:text-zinc-200">
                    {ensSync.ensSynced
                      ? `Published on ${chainLabel(ensSync.chainId)}. Current onchain value: @${ensSync.currentValue || ensSync.expectedValue}.`
                      : humanizeError(ensSync.reason)}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {!ensSync.ensSynced && ensSync.canPrepareTransaction ? (
                      <button
                        type="button"
                        onClick={() => void publishToEns()}
                        disabled={ensPublishing}
                        className="inline-flex h-10 items-center justify-center rounded-xl bg-emerald-600 px-4 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {ensPublishing ? "Publishing..." : "Publish to ENS"}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => void loadEnsSync(activeSocial.id)}
                      disabled={ensLoading || ensPublishing}
                      className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-300/70 bg-white/80 px-4 text-xs font-semibold text-zinc-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700/80 dark:bg-zinc-950/30 dark:text-zinc-50"
                    >
                      Refresh ENS
                    </button>
                    {ensSync.ensTxHash ? (
                      <a
                        href={`https://${ensSync.chainId === 11155111 ? "sepolia." : ""}etherscan.io/tx/${ensSync.ensTxHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-300/70 bg-white/80 px-4 text-xs font-semibold text-zinc-950 transition hover:bg-white dark:border-zinc-700/80 dark:bg-zinc-950/30 dark:text-zinc-50"
                      >
                        View transaction
                      </a>
                    ) : null}
                  </div>
                </>
              ) : (
                <div className="mt-3 text-xs text-zinc-600 dark:text-zinc-300">
                  ENS publish status will appear here after Telegram verification.
                </div>
              )}
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            {activeSocial.verified ? (
              <a
                href={`https://t.me/${activeSocial.username.replace(/^@/u, "")}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-300/70 bg-white/80 px-4 text-xs font-semibold text-zinc-950 transition hover:bg-white dark:border-zinc-700/80 dark:bg-zinc-950/30 dark:text-zinc-50"
              >
                Open Telegram
              </a>
            ) : null}
            <button
              type="button"
              onClick={() => void unlinkSocial(activeSocial.id)}
              disabled={removing === activeSocial.id}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-300/70 bg-white/80 px-4 text-xs font-semibold text-zinc-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700/80 dark:bg-zinc-950/30 dark:text-zinc-50"
            >
              {removing === activeSocial.id ? "Removing..." : "Unlink"}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-zinc-200/75 bg-zinc-50/85 px-4 py-3 text-sm text-zinc-600 dark:border-zinc-800/80 dark:bg-zinc-900/40 dark:text-zinc-300">
          No Telegram alias linked yet.
        </div>
      )}
    </section>
  );
}
