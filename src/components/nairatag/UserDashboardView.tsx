"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
  useEffect,
  useState,
  useTransition,
} from "react";

import { AuthModalButton } from "@/components/auth/AuthModalButton";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import type {
  BankAccountRecord,
  ClaimRecord,
  CryptoWalletRecord,
  CreditProfile,
  MarketplaceEligibility,
  MarketplaceListingDetail,
  MarketplaceTransferDetail,
  NotificationRecord,
  UserRecord,
} from "@/lib/adminTypes";
import { AppPageHeader } from "./AppPageHeader";
import { CopyButton } from "./CopyButton";
import { useToast } from "./ToastProvider";
import { Badge, CheckIcon, Container, cn } from "./ui";

const NAIRA = "\u20A6";
const BASE_CHAIN_ID = 8453;
const BASE_CHAIN_HEX = "0x2105";

type EthereumProvider = {
  request<T = unknown>(args: { method: string; params?: unknown[] | object }): Promise<T>;
};

type NotificationSummary = {
  total: number;
  unread: number;
  items: NotificationRecord[];
};

type ReferralDashboardData = {
  referralCode: string;
  referralHandle?: string | null;
  referralUrl: string;
  requiresHandle?: boolean;
  totalReferrals: number;
  convertedReferrals: number;
  referralPoints: number;
  pendingConversionPoints: number;
  signupPointsPerReferral: number;
  conversionPointsPerReferral: number;
  recent: Array<{
    id: string;
    createdAt: string;
    convertedAt?: string;
    points: number;
    signupPoints: number;
    conversionPoints: number;
    referredName: string | null;
    referredHandle: string | null;
  }>;
};

type MarketplaceDashboardData = {
  eligibility: MarketplaceEligibility;
  claim: ClaimRecord | null;
  bankAccount: BankAccountRecord | null;
  listing: MarketplaceListingDetail | null;
  creditProfile: CreditProfile | null;
  transfers: MarketplaceTransferDetail[];
  notifications: NotificationRecord[];
};

export type UserDashboardData = {
  user: UserRecord;
  claim: ClaimRecord | null;
  bankAccount: BankAccountRecord | null;
  cryptoWallet: CryptoWalletRecord | null;
  notifications: NotificationSummary;
  referrals: ReferralDashboardData | null;
  marketplace: MarketplaceDashboardData | null;
};

function formatDate(value?: string | null) {
  if (!value) return "Not set";
  return new Date(value).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value?: string | null) {
  if (!value) return "Not set";
  return new Date(value).toLocaleString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCurrency(value?: number | null) {
  if (value == null) return "Not set";
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value);
}

function maskWallet(value?: string) {
  if (!value) return "Not linked";
  if (value.length <= 12) return value;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function createNonce() {
  const bytes = new Uint8Array(24);
  window.crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function createWalletLinkMessage(displayHandle: string, timestamp: number, nonce: string) {
  return [
    `Link wallet to NairaTag handle: ${displayHandle}`,
    `Timestamp: ${timestamp}`,
    `Nonce: ${nonce}`,
  ].join("\n");
}

function compactId(value: string) {
  if (value.length <= 18) return value;
  return `${value.slice(0, 10)}...${value.slice(-5)}`;
}

function initials(user: UserRecord, claim: ClaimRecord | null) {
  const source = claim?.displayName && !/^pending verification$/i.test(claim.displayName)
    ? claim.displayName
    : user.fullName || user.phone || "NT";
  const value = source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  return /^[A-Z0-9]{1,2}$/.test(value) ? value : "NT";
}

function Avatar({
  user,
  claim,
  size = "md",
}: {
  user: UserRecord;
  claim: ClaimRecord | null;
  size?: "md" | "sm" | "xs";
}) {
  const sizeClass =
    size === "xs"
      ? "h-9 w-9 rounded-full text-xs"
      : size === "sm"
        ? "h-11 w-11 rounded-xl text-sm"
        : "h-14 w-14 rounded-2xl text-base";

  return (
    <div
      className={cn(
        "grid shrink-0 place-items-center overflow-hidden bg-zinc-950 font-semibold text-white shadow-sm dark:bg-white dark:text-zinc-950",
        sizeClass
      )}
    >
      {user.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        initials(user, claim)
      )}
    </div>
  );
}

function verificationTone(claim: ClaimRecord | null) {
  if (!claim) return "neutral";
  return claim.verification === "pending" ? "orange" : "verify";
}

function eligibilityText(eligibility?: MarketplaceEligibility | null) {
  if (!eligibility) return "Not loaded";
  switch (eligibility.reason) {
    case "eligible":
      return "Ready";
    case "no_handle":
      return "Claim needed";
    case "bank_link_required":
      return "Bank needed";
    case "reserved_short_handle":
      return "Reserved";
    case "ownership_cooldown":
      return "Cooldown";
    case "listing_already_exists":
      return "Listed";
    default:
      return "Sign in";
  }
}

function creditTone(profile: CreditProfile | null | undefined) {
  if (!profile) return "neutral";
  if (profile.riskBand === "low") return "verify";
  if (profile.riskBand === "medium") return "orange";
  return "neutral";
}

function Panel({
  title,
  action,
  children,
  className,
}: {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-xl border border-zinc-200/75 bg-white/80 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-950/35",
        className
      )}
    >
      {title || action ? (
        <div className="flex min-h-10 items-center justify-between gap-3 border-b border-zinc-200/60 px-3.5 py-2 dark:border-zinc-800/70">
          {title ? (
            <h2 className="text-[13px] font-semibold text-zinc-950 dark:text-zinc-50">
              {title}
            </h2>
          ) : (
            <span />
          )}
          {action}
        </div>
      ) : null}
      <div className="p-3.5">{children}</div>
    </section>
  );
}

function ActionLink({
  href,
  children,
  variant = "secondary",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
}) {
  return (
    <a
      href={href}
      className={cn(
        "inline-flex h-9 min-w-0 items-center justify-center rounded-xl px-3 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nt-orange/50",
        variant === "primary"
          ? "bg-nt-orange text-white hover:brightness-110"
          : "border border-zinc-300/70 bg-white/75 text-zinc-950 hover:bg-white dark:border-zinc-700/80 dark:bg-zinc-950/30 dark:text-zinc-50 dark:hover:bg-zinc-950/45"
      )}
    >
      {children}
    </a>
  );
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[4.75rem_minmax(0,1fr)] gap-2.5 border-b border-zinc-200/60 py-2 last:border-b-0 dark:border-zinc-800/70">
      <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-zinc-500 dark:text-zinc-400">
        {label}
      </div>
      <div className="min-w-0 break-words text-right text-[13px] font-semibold text-zinc-950 dark:text-zinc-50">
        {value}
      </div>
    </div>
  );
}

function StatIcon({
  children,
  tone = "neutral",
}: {
  children?: ReactNode;
  tone?: "neutral" | "verify" | "orange";
}) {
  return (
    <div
      className={cn(
        "grid h-8 w-8 shrink-0 place-items-center rounded-lg border",
        tone === "verify"
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200"
          : tone === "orange"
            ? "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-200"
            : "border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
      )}
    >
      {children ?? <span className="h-1.5 w-1.5 rounded-full bg-current" />}
    </div>
  );
}

function Metric({
  label,
  value,
  detail,
  tone = "neutral",
  icon,
}: {
  label: string;
  value: string;
  detail: string;
  tone?: "neutral" | "verify" | "orange";
  icon?: ReactNode;
}) {
  return (
    <div className="flex min-h-[3.5rem] items-center gap-2.5 rounded-xl border border-zinc-200/70 bg-white/80 px-3 py-2 dark:border-zinc-800/80 dark:bg-zinc-950/35">
      <StatIcon tone={tone}>{icon}</StatIcon>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[10px] font-semibold uppercase tracking-[0.1em] text-zinc-500 dark:text-zinc-400">
          {label}
        </div>
        <div className="mt-0.5 truncate text-sm font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          {value}
        </div>
      </div>
      <div className="max-w-[6.25rem] text-right text-[11px] leading-4 text-zinc-600 dark:text-zinc-300">
        {detail}
      </div>
    </div>
  );
}

function SetupLine({
  done,
  label,
  detail,
}: {
  done: boolean;
  label: string;
  detail: string;
}) {
  return (
    <div className="flex items-start gap-2.5 border-b border-zinc-200/60 py-2.5 last:border-b-0 dark:border-zinc-800/70">
      <CheckIcon
        className={cn(
          "mt-0.5 h-3.5 w-3.5 shrink-0",
          done ? "text-emerald-500" : "text-orange-500"
        )}
      />
      <div className="min-w-0">
        <div className="text-xs font-semibold text-zinc-950 dark:text-zinc-50">
          {label}
        </div>
        <div className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
          {detail}
        </div>
      </div>
    </div>
  );
}

function SignInState() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 transition-colors dark:bg-zinc-950 dark:text-zinc-50">
      <AppPageHeader ctaHref="/claim" ctaLabel="Claim a ₦handle" />
      <main className="py-6 sm:py-8">
        <Container className="max-w-3xl">
          <Panel className="overflow-hidden">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="orange" className="px-2 py-0.5 text-[11px]">
                Sign in required
              </Badge>
              <Badge tone="neutral" className="px-2 py-0.5 text-[11px]">
                {NAIRA}handle
              </Badge>
            </div>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-3xl">
              Sign in to continue.
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-600 dark:text-zinc-300">
              View your handle, payout setup, referrals, notifications, and
              marketplace records.
            </p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <AuthModalButton afterAuthHref="/dashboard" variant="primary">
                Sign in
              </AuthModalButton>
              <ActionLink href="/claim">Use phone claim flow</ActionLink>
            </div>
          </Panel>
        </Container>
      </main>
    </div>
  );
}

function SignOutButton({
  className,
}: {
  className?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function signOut() {
    startTransition(async () => {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Cache-Control": "no-store" },
      });
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={isPending}
      className={cn(
        "inline-flex h-9 items-center justify-center rounded-xl border border-zinc-300/70 bg-white/75 px-3 text-xs font-semibold text-zinc-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700/80 dark:bg-zinc-950/30 dark:text-zinc-50",
        className
      )}
    >
      {isPending ? "Signing out" : "Sign out"}
    </button>
  );
}

function WalletLinkPanel({
  claim,
  cryptoWallet,
}: {
  claim: ClaimRecord | null;
  cryptoWallet: CryptoWalletRecord | null;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function ensureBaseNetwork(provider: EthereumProvider) {
    const chainId = await provider.request<string>({ method: "eth_chainId" });
    if (Number(BigInt(chainId)) === BASE_CHAIN_ID) return chainId;

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
            chainName: "Base",
            nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
            rpcUrls: ["https://mainnet.base.org"],
            blockExplorerUrls: ["https://basescan.org"],
          },
        ],
      });
    }

    return provider.request<string>({ method: "eth_chainId" });
  }

  function linkWallet() {
    setStatus(null);
    setError(null);

    if (!claim) {
      setError("Claim a handle first.");
      return;
    }

    const provider = window.ethereum as EthereumProvider | undefined;
    if (!provider) {
      setError("Install or open an EVM wallet first.");
      return;
    }

    startTransition(async () => {
      try {
        const accounts = await provider.request<string[]>({
          method: "eth_requestAccounts",
        });
        const walletAddress = accounts[0];
        if (!walletAddress) throw new Error("wallet_not_connected");

        const chainId = await ensureBaseNetwork(provider);
        const displayHandle = `${NAIRA}${claim.handle}`;
        const timestamp = Date.now();
        const nonce = createNonce();
        const message = createWalletLinkMessage(displayHandle, timestamp, nonce);
        const signature = await provider.request<string>({
          method: "personal_sign",
          params: [message, walletAddress],
        });

        const response = await fetch("/api/wallet/link", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-store",
          },
          body: JSON.stringify({
            handle: displayHandle,
            wallet_address: walletAddress,
            signature,
            message,
            chain_id: chainId,
          }),
        });
        const body = (await response.json().catch(() => null)) as
          | { status?: "success"; wallet_address?: string; message?: string }
          | null;
        if (!response.ok || body?.status !== "success") {
          throw new Error(body?.message || "wallet_link_failed");
        }

        setStatus(`Wallet linked to ${displayHandle}`);
        router.refresh();
      } catch (err) {
        const message = err instanceof Error ? err.message : "wallet_link_failed";
        setError(
          message === "User rejected the request."
            ? "Signature rejected."
            : message.replace(/_/g, " ")
        );
      }
    });
  }

  return (
    <Panel title="Crypto wallet">
      <div className="space-y-3">
        <div className="grid gap-2">
          <DataRow label="Chain" value="Base" />
          <DataRow
            label="Wallet"
            value={cryptoWallet ? maskWallet(cryptoWallet.walletAddress) : "Not linked"}
          />
          <DataRow
            label="Status"
            value={cryptoWallet?.walletVerified ? "Verified" : "Signature required"}
          />
        </div>
        <button
          type="button"
          onClick={linkWallet}
          disabled={isPending || !claim}
          className="h-9 w-full rounded-xl bg-nt-orange px-3 text-xs font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Linking wallet" : cryptoWallet ? "Update wallet" : "Link wallet"}
        </button>
        <div className="min-h-4 text-[11px] font-medium">
          {status ? <span className="text-emerald-600 dark:text-emerald-300">{status}</span> : null}
          {error ? <span className="text-orange-700 dark:text-orange-300">{error}</span> : null}
        </div>
      </div>
    </Panel>
  );
}

function ProfileMenuIcon({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "orange" | "verify";
}) {
  return (
    <div
      className={cn(
        "grid h-6 w-6 shrink-0 place-items-center rounded-md",
        tone === "orange"
          ? "bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-200"
          : tone === "verify"
            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200"
            : "bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
      )}
    >
      {children}
    </div>
  );
}

function ProfileMenuRow({
  href,
  icon,
  label,
  trailing,
  showChevron = false,
  className,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  trailing?: ReactNode;
  showChevron?: boolean;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex h-9 items-center gap-2 rounded-[0.8rem] px-2 text-[13px] font-semibold text-zinc-950 transition hover:bg-zinc-100 dark:text-zinc-50 dark:hover:bg-zinc-900/70",
        className
      )}
    >
      {icon}
      <div className="min-w-0 flex-1 truncate">{label}</div>
      <div className="flex items-center gap-1.5 text-zinc-400 dark:text-zinc-500">
        {trailing}
        {showChevron ? (
          <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
            <path
              d="m9 6 6 6-6 6"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : null}
      </div>
    </Link>
  );
}

function HeaderProfileMenu({
  user,
  claim,
  unread,
}: {
  user: UserRecord;
  claim: ClaimRecord | null;
  unread: number;
}) {
  const profilePath = claim ? `/h/${claim.handle}` : "/claim";
  const payPath = "/dashboard/paylinks";
  const label = claim ? `${NAIRA}${claim.handle}` : user.phone;
  const contact = user.email || user.phone;
  const verificationLabel = claim ? claim.verification : "setup";

  return (
    <details className="group relative">
      <summary className="flex cursor-pointer list-none items-center gap-1 rounded-full border border-zinc-200/70 bg-white/85 px-1.5 py-0.5 text-sm font-semibold text-zinc-900 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-800/80 dark:bg-zinc-950/55 dark:text-zinc-50 dark:hover:bg-zinc-900/70 [&::-webkit-details-marker]:hidden">
        <Avatar user={user} claim={claim} size="xs" />
        <span className="hidden max-w-[9rem] truncate sm:inline">{label}</span>
        <span className="hidden text-[10px] text-zinc-400 transition group-open:rotate-180 sm:inline-block">
          v
        </span>
      </summary>
      <div className="absolute right-0 top-full z-50 mt-2 w-[14.4rem] rounded-[1.15rem] border border-zinc-200 bg-white p-1 shadow-[0_18px_40px_rgba(15,23,42,0.14)] ring-1 ring-black/5 dark:border-zinc-800 dark:bg-zinc-950 dark:ring-white/10 dark:shadow-[0_20px_46px_rgba(0,0,0,0.34)]">
        <div className="rounded-[0.95rem] border border-zinc-200/85 bg-white px-2 py-2 dark:border-zinc-800/85 dark:bg-zinc-950">
          <div className="flex items-center gap-2">
            <Avatar user={user} claim={claim} size="xs" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-semibold text-zinc-950 dark:text-zinc-50">
                {label}
              </div>
              <div className="truncate text-[10px] text-zinc-600 dark:text-zinc-300">
                {contact}
              </div>
            </div>
            <Badge
              tone={claim ? "verify" : "orange"}
              className="shrink-0 px-1.5 py-0.5 text-[9px]"
            >
              {verificationLabel}
            </Badge>
          </div>
        </div>

        <div className="mt-1 rounded-[0.95rem] border border-zinc-200/85 bg-zinc-50 p-1 dark:border-zinc-800/85 dark:bg-zinc-900/55">
          <ProfileMenuRow
            href={profilePath}
            icon={
              <ProfileMenuIcon tone={claim ? "verify" : "orange"}>
                <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3" aria-hidden="true">
                  <path
                    d="M4 12c2.7-4.2 5.7-6.3 8-6.3s5.3 2.1 8 6.3c-2.7 4.2-5.7 6.3-8 6.3S6.7 16.2 4 12Z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.8" />
                </svg>
              </ProfileMenuIcon>
            }
            label={claim ? "Public profile" : "Claim handle"}
          />
          <ProfileMenuRow
            href="/settings"
            icon={
              <ProfileMenuIcon>
                <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3" aria-hidden="true">
                  <path
                    d="M12 8.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7Zm7.2 3-.9-.5.1-1a1 1 0 0 0-.6-1l-1-.4-.3-1a1 1 0 0 0-1-.6l-1 .1-.5-.9a1 1 0 0 0-1-.5l-1 .2-.7-.7a1 1 0 0 0-1.3 0l-.7.7-1-.2a1 1 0 0 0-1 .5l-.5.9-1-.1a1 1 0 0 0-1 .6l-.3 1-1 .4a1 1 0 0 0-.6 1l.1 1-.9.5a1 1 0 0 0-.5 1l.2 1-.7.7a1 1 0 0 0 0 1.3l.7.7-.2 1a1 1 0 0 0 .5 1l.9.5-.1 1a1 1 0 0 0 .6 1l1 .4.3 1a1 1 0 0 0 1 .6l1-.1.5.9a1 1 0 0 0 1 .5l1-.2.7.7a1 1 0 0 0 1.3 0l.7-.7 1 .2a1 1 0 0 0 1-.5l.5-.9 1 .1a1 1 0 0 0 1-.6l.3-1 1-.4a1 1 0 0 0 .6-1l-.1-1 .9-.5a1 1 0 0 0 .5-1l-.2-1 .7-.7a1 1 0 0 0 0-1.3l-.7-.7.2-1a1 1 0 0 0-.5-1Z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </ProfileMenuIcon>
            }
            label="Settings"
            className="bg-white shadow-[inset_0_0_0_1px_rgba(228,228,231,0.9)] dark:bg-zinc-950/90 dark:shadow-[inset_0_0_0_1px_rgba(63,63,70,0.95)]"
          />
          <ProfileMenuRow
            href="/notifications"
            icon={
              <ProfileMenuIcon tone={unread > 0 ? "orange" : "neutral"}>
                <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3" aria-hidden="true">
                  <path
                    d="M8 18h8M10.5 21h3M6 18V11a6 6 0 1 1 12 0v7l1.5 1.5H4.5L6 18Z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </ProfileMenuIcon>
            }
            label="Notifications"
            trailing={
              unread > 0 ? (
                <span className="rounded-full bg-nt-orange px-1.5 py-0.5 text-[9px] font-semibold text-white">
                  {unread}
                </span>
              ) : null
            }
          />
          <ProfileMenuRow
            href="/points"
            icon={
              <ProfileMenuIcon tone={(user.pointsBalance ?? 0) > 0 ? "verify" : "neutral"}>
                <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3" aria-hidden="true">
                  <path
                    d="M12 4 14.2 8.5 19 9.2l-3.5 3.4.8 4.8-4.3-2.3-4.3 2.3.8-4.8L5 9.2l4.8-.7L12 4Z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinejoin="round"
                  />
                </svg>
              </ProfileMenuIcon>
            }
            label="Points"
            trailing={
              (user.pointsBalance ?? 0) > 0 ? (
                <span className="rounded-full bg-emerald-500 px-1.5 py-0.5 text-[9px] font-semibold text-white">
                  {user.pointsBalance}
                </span>
              ) : null
            }
          />
          <ProfileMenuRow
            href={payPath}
            icon={
              <ProfileMenuIcon tone="verify">
                <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3" aria-hidden="true">
                  <path
                    d="M4 8.5h16M6 5h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm9.5 8H18"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </ProfileMenuIcon>
            }
            label={claim ? "Pay page" : "Payment links"}
          />
          <div className="mx-1 border-t border-zinc-200/80 dark:border-zinc-800/80" />
          <div className="flex h-9 items-center gap-2 rounded-[0.8rem] px-2 text-[13px] font-semibold text-zinc-950 dark:text-zinc-50">
            <ProfileMenuIcon>
              <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3" aria-hidden="true">
                <path
                  d="M12 3v2.5m0 13V21m7.5-9H21M3 12h2.5M17.3 6.7l1.8-1.8M4.9 19.1l1.8-1.8M6.7 6.7 4.9 4.9M19.1 19.1l-1.8-1.8M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </ProfileMenuIcon>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                Appearance
              </div>
            </div>
            <ThemeToggle
              size="compact"
              className="border-zinc-200 bg-zinc-50 text-zinc-700 shadow-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>
        </div>

        <div className="mt-1 rounded-[0.95rem] border border-zinc-200/85 bg-white p-1 dark:border-zinc-800/85 dark:bg-zinc-950">
          <div className="px-1">
            <SignOutButton className="w-full justify-start rounded-[0.8rem] border-0 bg-transparent px-2 text-[13px] text-rose-700 hover:bg-rose-50 dark:text-rose-200 dark:hover:bg-rose-950/24" />
          </div>
        </div>
      </div>
    </details>
  );
}

function NotificationBell({
  unread,
}: {
  unread: number;
}) {
  return (
    <Link
      href="/notifications"
      aria-label={
        unread > 0
          ? `Open notifications, ${unread} unread`
          : "Open notifications"
      }
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200/70 bg-white/85 text-zinc-900 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-800/80 dark:bg-zinc-950/55 dark:text-zinc-50 dark:hover:bg-zinc-900/70"
    >
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M8 18h8M10.5 21h3M6 18V11a6 6 0 1 1 12 0v7l1.5 1.5H4.5L6 18Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {unread > 0 ? (
        <>
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-nt-orange" />
          <span className="sr-only">{unread} unread notifications</span>
        </>
      ) : null}
    </Link>
  );
}

function fileToAvatarDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("image_required"));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      reject(new Error("image_too_large"));
      return;
    }

    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      const size = 256;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("image_upload_failed"));
        return;
      }

      const scale = Math.max(size / image.width, size / image.height);
      const width = image.width * scale;
      const height = image.height * scale;
      const x = (size - width) / 2;
      const y = (size - height) / 2;

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(image, x, y, width, height);
      URL.revokeObjectURL(objectUrl);
      resolve(canvas.toDataURL("image/jpeg", 0.84));
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("image_upload_failed"));
    };
    image.src = objectUrl;
  });
}

function ProfileEditorModal({
  user,
  claim,
  open,
  onClose,
}: {
  user: UserRecord;
  claim: ClaimRecord | null;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const nextFullName =
    claim?.displayName && !/^pending verification$/i.test(claim.displayName)
      ? claim.displayName
      : user.fullName ?? "";
  const [fullName, setFullName] = useState(nextFullName);
  const [handle, setHandle] = useState(claim?.handle ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl ?? "");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;

    setFullName(nextFullName);
    setHandle(claim?.handle ?? "");
    setAvatarUrl(user.avatarUrl ?? "");
    setStatus(null);
    setError(null);
  }, [open, nextFullName, claim?.handle, user.avatarUrl]);

  useEffect(() => {
    if (!open || typeof document === "undefined") return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  async function selectAvatarFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setStatus(null);
    setError(null);
    try {
      setAvatarUrl(await fileToAvatarDataUrl(file));
      setStatus("Image ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : "image_upload_failed");
    }
  }

  function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);
    setError(null);

    startTransition(async () => {
      try {
        const response = await fetch("/api/profile/me", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-store",
          },
          body: JSON.stringify({
            fullName,
            handle,
            avatarUrl,
          }),
        });
        const body = (await response.json().catch(() => null)) as
          | { ok?: true; error?: string }
          | null;
        if (!response.ok || !body?.ok) {
          throw new Error(body?.error || "profile_update_failed");
        }
        setStatus("Saved");
        toast({
          title: "Profile updated",
          description: "Your dashboard profile is up to date.",
          tone: "success",
        });
        onClose();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "profile_update_failed");
      }
    });
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-zinc-950/38 px-4 py-6 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-lg rounded-[1.4rem] border border-zinc-200/85 bg-white p-4 shadow-[0_30px_70px_rgba(15,23,42,0.18)] ring-1 ring-black/5 dark:border-zinc-800/85 dark:bg-zinc-950 dark:ring-white/10 dark:shadow-[0_32px_72px_rgba(0,0,0,0.45)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-zinc-200/70 pb-3 dark:border-zinc-800/70">
          <div>
            <div className="text-base font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
              Edit profile
            </div>
            <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
              Update your public name, handle, and profile image.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-900 dark:hover:text-zinc-200"
            aria-label="Close edit profile modal"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
              <path
                d="m15 9-6 6m0-6 6 6"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={saveProfile} className="mt-4 space-y-3">
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-500 dark:text-zinc-400">
              Username
            </span>
            <div className="mt-1 flex rounded-xl border border-zinc-200/80 bg-white/80 text-sm dark:border-zinc-800/80 dark:bg-zinc-950/40">
              <span className="grid w-9 place-items-center border-r border-zinc-200/70 text-zinc-500 dark:border-zinc-800/70">
                {NAIRA}
              </span>
              <input
                value={handle}
                onChange={(event) =>
                  setHandle(event.target.value.replace(/[^\w]/g, "").toLowerCase())
                }
                maxLength={20}
                placeholder="your_handle"
                disabled={!claim || isPending}
                className="min-w-0 flex-1 bg-transparent px-3 py-2 text-xs font-semibold text-zinc-950 outline-none placeholder:text-zinc-400 disabled:opacity-60 dark:text-zinc-50"
              />
            </div>
          </label>

          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-500 dark:text-zinc-400">
              Public name
            </span>
            <input
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              maxLength={80}
              placeholder="Your name"
              disabled={isPending}
              className="mt-1 h-9 w-full rounded-xl border border-zinc-200/80 bg-white/80 px-3 text-xs font-semibold text-zinc-950 outline-none placeholder:text-zinc-400 disabled:opacity-60 dark:border-zinc-800/80 dark:bg-zinc-950/40 dark:text-zinc-50"
            />
          </label>

          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-500 dark:text-zinc-400">
              Profile image
            </span>
            <div className="mt-1 flex items-center gap-2">
              <div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-xl bg-zinc-950 text-xs font-semibold text-white dark:bg-white dark:text-zinc-950">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  initials(user, claim)
                )}
              </div>
              <input
                value={avatarUrl}
                onChange={(event) => setAvatarUrl(event.target.value)}
                placeholder="Image URL or upload"
                disabled={isPending}
                className="h-9 min-w-0 flex-1 rounded-xl border border-zinc-200/80 bg-white/80 px-3 text-xs font-semibold text-zinc-950 outline-none placeholder:text-zinc-400 disabled:opacity-60 dark:border-zinc-800/80 dark:bg-zinc-950/40 dark:text-zinc-50"
              />
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <label className="inline-flex h-8 cursor-pointer items-center justify-center rounded-lg border border-zinc-300/70 bg-white/75 px-2.5 text-[11px] font-semibold text-zinc-950 transition hover:bg-white dark:border-zinc-700/80 dark:bg-zinc-950/30 dark:text-zinc-50">
                Upload
                <input
                  type="file"
                  accept="image/*"
                  onChange={selectAvatarFile}
                  disabled={isPending}
                  className="sr-only"
                />
              </label>
              <button
                type="button"
                onClick={() => setAvatarUrl("")}
                disabled={isPending || !avatarUrl}
                className="h-8 rounded-lg border border-zinc-300/70 bg-white/75 px-2.5 text-[11px] font-semibold text-zinc-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700/80 dark:bg-zinc-950/30 dark:text-zinc-50"
              >
                Remove
              </button>
            </div>
          </label>

          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="min-w-0 text-[11px] font-medium">
              {status ? <span className="text-emerald-600 dark:text-emerald-300">{status}</span> : null}
              {error ? <span className="text-orange-700 dark:text-orange-300">{error}</span> : null}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="h-9 rounded-xl border border-zinc-300/70 bg-white/75 px-3 text-xs font-semibold text-zinc-950 transition hover:bg-white dark:border-zinc-700/80 dark:bg-zinc-950/30 dark:text-zinc-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="h-9 rounded-xl bg-nt-orange px-3 text-xs font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending ? "Saving" : "Save profile"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export function UserDashboardView({ data }: { data: UserDashboardData | null }) {
  const [isProfileEditorOpen, setProfileEditorOpen] = useState(false);
  if (!data) return <SignInState />;

  const { user, claim, bankAccount, cryptoWallet, notifications, referrals, marketplace } = data;
  const handleLabel = claim ? `${NAIRA}${claim.handle}` : "No handle";
  const profilePath = claim ? `/h/${claim.handle}` : "";
  const marketplaceEligibility = marketplace?.eligibility;
  const creditProfile = marketplace?.creditProfile ?? null;
  const listing = marketplace?.listing ?? null;
  const displayName =
    claim?.displayName && !/^pending verification$/i.test(claim.displayName)
      ? claim.displayName
      : user.fullName || user.phone;

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 transition-colors dark:bg-zinc-950 dark:text-zinc-50">
      <AppPageHeader
        ctaHref={claim ? profilePath : "/claim"}
        ctaLabel={claim ? "Public profile" : "Claim a ₦handle"}
        rightSlot={
          <div className="flex items-center gap-2">
            <NotificationBell unread={notifications.unread} />
            <HeaderProfileMenu
              user={user}
              claim={claim}
              unread={notifications.unread}
            />
          </div>
        }
      />

      <main className="py-5 sm:py-6">
        <Container className="max-w-7xl space-y-4">
          <div className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)] xl:grid-cols-[19rem_minmax(0,1fr)]">
            <aside className="static space-y-4 self-start">
              <section className="overflow-hidden rounded-2xl border border-zinc-200/75 bg-white/85 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-950/35">
                <div className="h-14 bg-gradient-to-r from-orange-500 via-orange-200 to-emerald-200 dark:from-orange-600 dark:via-orange-950 dark:to-emerald-950" />
                <div className="p-4 pt-0">
                  <div className="-mt-7 flex items-end gap-3">
                    <button
                      type="button"
                      onClick={() => setProfileEditorOpen(true)}
                      className="relative rounded-2xl border-4 border-white transition hover:-translate-y-0.5 dark:border-zinc-950"
                      aria-label="Open edit profile modal"
                    >
                      <Avatar user={user} claim={claim} />
                      <span className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full border border-white bg-nt-orange text-white shadow-sm dark:border-zinc-950">
                        <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
                          <path
                            d="m8 16 6.8-6.8 2 2L10 18H8v-2Zm8.2-7.2 1-1a1.4 1.4 0 1 0-2-2l-1 1 2 2Z"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                    </button>
                    <div className="min-w-0 pb-1">
                      <div className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                        {displayName}
                      </div>
                      <div className="truncate text-xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                        {handleLabel}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <Badge tone={verificationTone(claim)} className="px-2 py-0.5 text-[11px]">
                      {claim ? claim.verification.replace("_", " ") : "No handle"}
                    </Badge>
                    <Badge tone={bankAccount ? "verify" : "orange"} className="px-2 py-0.5 text-[11px]">
                      {bankAccount ? "Payout linked" : "Payout needed"}
                    </Badge>
                    {user.bvnLinkedAt ? (
                      <Badge tone="verify" className="px-2 py-0.5 text-[11px]">
                        BVN
                      </Badge>
                    ) : null}
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {claim ? (
                      <CopyButton
                        value={profilePath}
                        label="Copy path"
                        copiedLabel="Copied"
                        className="h-9 px-3 py-0 text-xs"
                      />
                    ) : null}
                    <ActionLink href="/points">Points</ActionLink>
                    <ActionLink href="/marketplace">Market</ActionLink>
                  </div>
                </div>
              </section>

              <Panel title="Account">
                <DataRow label="Phone" value={user.phone || "Not set"} />
                <DataRow label="Email" value={user.email || "Not linked"} />
                <DataRow label="Wallet" value={maskWallet(user.walletAddress)} />
                <DataRow label="Joined" value={formatDate(user.createdAt)} />
                <DataRow label="User ID" value={compactId(user.id)} />
              </Panel>

              <WalletLinkPanel claim={claim} cryptoWallet={cryptoWallet} />

              <Panel title="Setup">
                <SetupLine
                  done={Boolean(user.phoneVerifiedAt)}
                  label="Phone verified"
                  detail={formatDateTime(user.phoneVerifiedAt)}
                />
                <SetupLine
                  done={Boolean(claim)}
                  label="Handle claimed"
                  detail={claim ? `${NAIRA}${claim.handle}` : "Claim needed"}
                />
                <SetupLine
                  done={Boolean(user.bvnLinkedAt)}
                  label="BVN linked"
                  detail={user.bvnLinkedAt ? formatDate(user.bvnLinkedAt) : "Pending"}
                />
                <SetupLine
                  done={Boolean(bankAccount)}
                  label="Payout"
                  detail={bankAccount ? `${bankAccount.bankName} ${bankAccount.accountNumberMasked}` : "Not linked"}
                />
                <SetupLine
                  done={Boolean(cryptoWallet?.walletVerified)}
                  label="Crypto"
                  detail={cryptoWallet ? `Base ${maskWallet(cryptoWallet.walletAddress)}` : "Wallet not linked"}
                />
              </Panel>
            </aside>

            <section className="min-w-0 space-y-4">
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                <Metric
                  label="Handle"
                  value={handleLabel}
                  detail={claim ? `Claimed ${formatDate(claim.claimedAt)}` : "None yet"}
                  tone={claim ? "verify" : "orange"}
                  icon={
                    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                      <path
                        d="M8 5v14M16 5v14M5 9h14M5 15h14"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                    </svg>
                  }
                />
                <Metric
                  label="Payout"
                  value={bankAccount ? bankAccount.bankName : "Not linked"}
                  detail={bankAccount ? bankAccount.status.replace("_", " ") : "Required"}
                  tone={bankAccount ? "verify" : "orange"}
                  icon={
                    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                      <path
                        d="M4 8.5h16M6 5h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm9.5 8H18"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  }
                />
                <Metric
                  label="Crypto"
                  value={cryptoWallet ? "Base linked" : "Not linked"}
                  detail={cryptoWallet ? maskWallet(cryptoWallet.walletAddress) : "Wallet required"}
                  tone={cryptoWallet ? "verify" : "orange"}
                  icon={
                    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                      <path
                        d="M12 3v18m0-18 6 6m-6-6-6 6m6 12 6-6m-6 6-6-6"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  }
                />
                <Metric
                  label="Points"
                  value={String(user.pointsBalance ?? 0)}
                  detail={
                    (referrals?.referralPoints ?? 0) > 0
                      ? `${referrals?.referralPoints ?? 0} from referrals`
                      : "Welcome reward ready"
                  }
                  tone={(user.pointsBalance ?? 0) > 0 ? "verify" : "neutral"}
                  icon={
                    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                      <path
                        d="M7.5 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm9 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-9 8v-1a4 4 0 0 1 4-4h1a4 4 0 0 1 4 4v1M4 19v-.5A3.5 3.5 0 0 1 7.5 15M20 19v-.5A3.5 3.5 0 0 0 16.5 15"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  }
                />
                <Metric
                  label="Marketplace"
                  value={listing ? listing.listing.status.replace("_", " ") : eligibilityText(marketplaceEligibility)}
                  detail={listing ? `${listing.offers.length} offer(s)` : "No listing"}
                  tone={marketplaceEligibility?.eligible || listing ? "verify" : "orange"}
                  icon={
                    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                      <path
                        d="M5 8.5h14l-1 10.5H6L5 8.5ZM9 8.5V7a3 3 0 1 1 6 0v1.5"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  }
                />
              </div>

              <Panel
                title="Trust and credit"
                action={
                  <Badge tone={creditTone(creditProfile)} className="px-2 py-0.5 text-[11px]">
                    {creditProfile ? creditProfile.riskBand : "not ready"}
                  </Badge>
                }
              >
                <div className="grid gap-2 lg:grid-cols-[repeat(3,minmax(0,1fr))_minmax(0,1.2fr)]">
                  <Metric
                    label="Score"
                    value={creditProfile ? String(creditProfile.score) : "-"}
                    detail="Credit"
                    tone={creditTone(creditProfile)}
                    icon={
                      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                        <path
                          d="M4 18h16M7 15l2.5-3 3 2 4-5 1.5 2"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    }
                  />
                  <Metric
                    label="Trust"
                    value={creditProfile ? String(creditProfile.trustScore) : "-"}
                    detail="Score"
                    tone={creditProfile ? "verify" : "neutral"}
                    icon={
                      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                        <path
                          d="M12 4 6 6.5V12c0 4.2 2.6 6.9 6 8 3.4-1.1 6-3.8 6-8V6.5L12 4Z"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    }
                  />
                  <Metric
                    label="Limit"
                    value={creditProfile ? formatCurrency(creditProfile.recommendedLimit) : "-"}
                    detail="Suggested"
                    tone={creditProfile ? "verify" : "neutral"}
                    icon={
                      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                        <path
                          d="M12 4v16M8.5 7.5c0-1.4 1.6-2.5 3.5-2.5s3.5 1.1 3.5 2.5S13.9 10 12 10s-3.5 1.1-3.5 2.5S10.1 15 12 15s3.5 1.1 3.5 2.5"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    }
                  />
                  <div className="min-w-0 rounded-xl border border-zinc-200/70 bg-zinc-50/80 px-3 py-2.5 dark:border-zinc-800/80 dark:bg-zinc-900/35">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-zinc-500 dark:text-zinc-400">
                      Drivers
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {(creditProfile?.drivers.length
                        ? creditProfile.drivers.slice(0, 3)
                        : ["No credit profile yet."]
                      ).map((driver) => (
                        <span
                          key={driver}
                          className="inline-flex max-w-full items-center rounded-full border border-zinc-200 bg-white px-2 py-1 text-[11px] font-medium text-zinc-700 dark:border-zinc-700 dark:bg-zinc-950/60 dark:text-zinc-200"
                        >
                          {driver}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </Panel>

              <div className="grid gap-4 xl:grid-cols-2">
                <Panel
                  title="Referrals"
                  action={
                    <Badge
                      tone={referrals?.requiresHandle ? "orange" : "verify"}
                      className="px-2 py-0.5 text-[11px]"
                    >
                      {referrals?.requiresHandle ? "needed" : "active"}
                    </Badge>
                  }
                >
                  <div className="grid grid-cols-2 gap-2">
                    <Metric
                      label="Points"
                      value={String(referrals?.referralPoints ?? 0)}
                      detail="Earned"
                      tone={(referrals?.referralPoints ?? 0) > 0 ? "verify" : "neutral"}
                      icon={
                        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                          <path
                            d="M12 4 14.2 8.5 19 9.2l-3.5 3.4.8 4.8-4.3-2.3-4.3 2.3.8-4.8L5 9.2l4.8-.7L12 4Z"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinejoin="round"
                          />
                        </svg>
                      }
                    />
                    <Metric
                      label="Converted"
                      value={String(referrals?.convertedReferrals ?? 0)}
                      detail={`${referrals?.totalReferrals ?? 0} total`}
                      tone={(referrals?.convertedReferrals ?? 0) > 0 ? "verify" : "neutral"}
                      icon={
                        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                          <path
                            d="M7 12h10m0 0-3.5-3.5M17 12l-3.5 3.5M7 6h7m-7 12h7"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      }
                    />
                  </div>
                  <div className="mt-2 rounded-lg bg-zinc-50/85 px-2.5 py-2 font-mono text-[11px] text-zinc-700 dark:bg-zinc-900/35 dark:text-zinc-200">
                    <div className="truncate">
                      {referrals?.referralUrl || "Claim handle to activate"}
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <ActionLink href="/referrals">Open</ActionLink>
                    {referrals?.referralUrl ? (
                      <CopyButton
                        value={referrals.referralUrl}
                        label="Copy"
                        copiedLabel="Copied"
                        className="h-9 px-3 py-0 text-xs"
                      />
                    ) : null}
                  </div>
                </Panel>

                <Panel
                  title="Marketplace"
                  action={
                    <Badge
                      tone={listing || marketplaceEligibility?.eligible ? "verify" : "orange"}
                      className="px-2 py-0.5 text-[11px]"
                    >
                      {marketplace?.transfers.length ?? 0} transfer(s)
                    </Badge>
                  }
                >
                  <div className="grid gap-2 sm:grid-cols-3">
                    <Metric
                      label="Status"
                      value={
                        listing
                          ? listing.listing.status.replace("_", " ")
                          : eligibilityText(marketplaceEligibility)
                      }
                      detail={`${marketplace?.transfers.length ?? 0} moves`}
                      tone={listing || marketplaceEligibility?.eligible ? "verify" : "orange"}
                      icon={
                        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                          <path
                            d="M5 12h14m-4-4 4 4-4 4"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      }
                    />
                    <Metric
                      label="Offers"
                      value={listing ? String(listing.offers.length) : "0"}
                      detail={listing ? "Live interest" : "No offers"}
                      tone={listing?.offers.length ? "verify" : "neutral"}
                      icon={
                        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                          <path
                            d="M6 8h12M6 12h8M6 16h6M18 6v12l-3-2-3 2V6"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      }
                    />
                    <Metric
                      label="Ask"
                      value={listing ? formatCurrency(listing.listing.askAmount) : "Not listed"}
                      detail={listing ? "Seller ask" : "Create listing"}
                      tone={listing ? "verify" : "orange"}
                      icon={
                        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                          <path
                            d="M12 4v16M8.5 7.5c0-1.4 1.6-2.5 3.5-2.5s3.5 1.1 3.5 2.5S13.9 10 12 10s-3.5 1.1-3.5 2.5S10.1 15 12 15s3.5 1.1 3.5 2.5"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      }
                    />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <ActionLink href="/marketplace">Open</ActionLink>
                    {claim ? <ActionLink href={`/marketplace/${claim.handle}`}>Listing</ActionLink> : null}
                  </div>
                </Panel>
              </div>
            </section>
          </div>
        </Container>
      </main>
      <ProfileEditorModal
        user={user}
        claim={claim}
        open={isProfileEditorOpen}
        onClose={() => setProfileEditorOpen(false)}
      />
    </div>
  );
}
