"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ChangeEvent, type FormEvent, useState, useTransition } from "react";

import { AuthModalButton } from "@/components/auth/AuthModalButton";
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
  size?: "md" | "sm";
}) {
  const sizeClass = size === "sm" ? "h-11 w-11 rounded-xl text-sm" : "h-14 w-14 rounded-2xl text-base";

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
        "rounded-2xl border border-zinc-200/75 bg-white/80 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-950/35",
        className
      )}
    >
      {title || action ? (
        <div className="flex min-h-11 items-center justify-between gap-3 border-b border-zinc-200/60 px-4 py-2.5 dark:border-zinc-800/70">
          {title ? (
            <h2 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
              {title}
            </h2>
          ) : (
            <span />
          )}
          {action}
        </div>
      ) : null}
      <div className="p-4">{children}</div>
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
    <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-3 border-b border-zinc-200/60 py-2.5 last:border-b-0 dark:border-zinc-800/70">
      <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-500 dark:text-zinc-400">
        {label}
      </div>
      <div className="min-w-0 break-words text-right text-xs font-semibold text-zinc-950 dark:text-zinc-50">
        {value}
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  detail,
  tone = "neutral",
}: {
  label: string;
  value: string;
  detail: string;
  tone?: "neutral" | "verify" | "orange";
}) {
  return (
    <div className="rounded-2xl border border-zinc-200/70 bg-white/80 p-3 dark:border-zinc-800/80 dark:bg-zinc-950/35">
      <div className="flex items-center justify-between gap-2">
        <div className="truncate text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-500 dark:text-zinc-400">
          {label}
        </div>
        <span
          className={cn(
            "h-1.5 w-1.5 shrink-0 rounded-full",
            tone === "verify"
              ? "bg-emerald-500"
              : tone === "orange"
                ? "bg-orange-500"
                : "bg-zinc-400"
          )}
        />
      </div>
      <div className="mt-2 truncate text-lg font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
        {value}
      </div>
      <div className="mt-1 truncate text-xs text-zinc-600 dark:text-zinc-300">
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
      <AppPageHeader ctaHref="/agent" ctaLabel="Claim a handle" />
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
              <ActionLink href="/agent">Use phone claim flow</ActionLink>
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

function HeaderProfileMenu({
  user,
  claim,
}: {
  user: UserRecord;
  claim: ClaimRecord | null;
}) {
  const profilePath = claim ? `/h/${claim.handle}` : "/agent";
  const payPath = claim ? `/pay/${claim.handle}` : "/payments/payment-links";
  const label = claim ? `${NAIRA}${claim.handle}` : user.phone;
  const itemClass =
    "block rounded-xl px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900 dark:hover:text-white";

  return (
    <details className="group relative">
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full border border-zinc-200/70 bg-white/85 px-2 py-1.5 text-sm font-semibold text-zinc-900 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-800/80 dark:bg-zinc-950/55 dark:text-zinc-50 dark:hover:bg-zinc-900/70 [&::-webkit-details-marker]:hidden">
        <Avatar user={user} claim={claim} size="sm" />
        <span className="hidden max-w-[9rem] truncate sm:inline">{label}</span>
        <span className="text-[10px] text-zinc-400 transition group-open:rotate-180">v</span>
      </summary>
      <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-2xl border border-zinc-200/80 bg-white/95 p-1.5 shadow-xl shadow-zinc-950/10 backdrop-blur dark:border-zinc-800/80 dark:bg-zinc-950/95 dark:shadow-black/30">
        <Link
          href={profilePath}
          className={itemClass}
        >
          {claim ? "Profile" : "Claim handle"}
        </Link>
        <Link
          href={payPath}
          className={itemClass}
        >
          {claim ? "Pay page" : "Pay links"}
        </Link>
          <Link
            href="/payments/payment-links"
            className={itemClass}
          >
            Pay links
          </Link>
        <div className="border-t border-zinc-200/70 px-1 pt-1.5 dark:border-zinc-800/80">
          <SignOutButton className="w-full justify-center border-0 bg-transparent px-3 hover:bg-zinc-100 dark:hover:bg-zinc-900" />
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
      className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200/70 bg-white/85 text-zinc-900 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-800/80 dark:bg-zinc-950/55 dark:text-zinc-50 dark:hover:bg-zinc-900/70"
    >
      <svg
        viewBox="0 0 24 24"
        className="h-4.5 w-4.5"
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
          <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-nt-orange" />
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

function ProfileEditor({
  user,
  claim,
}: {
  user: UserRecord;
  claim: ClaimRecord | null;
}) {
  const router = useRouter();
  const [fullName, setFullName] = useState(
    claim?.displayName && !/^pending verification$/i.test(claim.displayName)
      ? claim.displayName
      : user.fullName ?? ""
  );
  const [handle, setHandle] = useState(claim?.handle ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl ?? "");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "profile_update_failed");
      }
    });
  }

  return (
    <Panel title="Edit profile">
      <form onSubmit={saveProfile} className="space-y-3">
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

        <div className="flex items-center justify-between gap-3">
          <button
            type="submit"
            disabled={isPending}
            className="h-9 rounded-xl bg-nt-orange px-3 text-xs font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Saving" : "Save profile"}
          </button>
          <div className="min-w-0 text-right text-[11px] font-medium">
            {status ? <span className="text-emerald-600 dark:text-emerald-300">{status}</span> : null}
            {error ? <span className="text-orange-700 dark:text-orange-300">{error}</span> : null}
          </div>
        </div>
      </form>
    </Panel>
  );
}

export function UserDashboardView({ data }: { data: UserDashboardData | null }) {
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
        ctaHref={claim ? profilePath : "/agent"}
        ctaLabel={claim ? "Public profile" : "Claim a handle"}
        rightSlot={
          <div className="flex items-center gap-2">
            <NotificationBell unread={notifications.unread} />
            <HeaderProfileMenu
              user={user}
              claim={claim}
            />
          </div>
        }
      />

      <main className="py-5 sm:py-6">
        <Container className="max-w-7xl space-y-4">
          <div className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)] xl:grid-cols-[19rem_minmax(0,1fr)]">
            <aside className="space-y-4">
              <section className="overflow-hidden rounded-2xl border border-zinc-200/75 bg-white/85 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-950/35">
                <div className="h-14 bg-gradient-to-r from-orange-500 via-orange-200 to-emerald-200 dark:from-orange-600 dark:via-orange-950 dark:to-emerald-950" />
                <div className="p-4 pt-0">
                  <div className="-mt-7 flex items-end gap-3">
                    <div className="rounded-2xl border-4 border-white dark:border-zinc-950">
                      <Avatar user={user} claim={claim} />
                    </div>
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

              <ProfileEditor user={user} claim={claim} />

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
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Metric
                  label="Handle"
                  value={handleLabel}
                  detail={claim ? `Claimed ${formatDate(claim.claimedAt)}` : "None yet"}
                  tone={claim ? "verify" : "orange"}
                />
                <Metric
                  label="Payout"
                  value={bankAccount ? bankAccount.bankName : "Not linked"}
                  detail={bankAccount ? bankAccount.status.replace("_", " ") : "Required"}
                  tone={bankAccount ? "verify" : "orange"}
                />
                <Metric
                  label="Crypto"
                  value={cryptoWallet ? "Base linked" : "Not linked"}
                  detail={cryptoWallet ? maskWallet(cryptoWallet.walletAddress) : "Wallet required"}
                  tone={cryptoWallet ? "verify" : "orange"}
                />
                <Metric
                  label="Referrals"
                  value={String(referrals?.referralPoints ?? 0)}
                  detail={`${referrals?.totalReferrals ?? 0} signup(s)`}
                  tone={(referrals?.totalReferrals ?? 0) > 0 ? "verify" : "neutral"}
                />
                <Metric
                  label="Marketplace"
                  value={listing ? listing.listing.status.replace("_", " ") : eligibilityText(marketplaceEligibility)}
                  detail={listing ? `${listing.offers.length} offer(s)` : "No listing"}
                  tone={marketplaceEligibility?.eligible || listing ? "verify" : "orange"}
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
                <div className="grid gap-3 sm:grid-cols-[10rem_10rem_10rem_minmax(0,1fr)]">
                  <Metric
                    label="Score"
                    value={creditProfile ? String(creditProfile.score) : "-"}
                    detail="Credit"
                    tone={creditTone(creditProfile)}
                  />
                  <Metric
                    label="Trust"
                    value={creditProfile ? String(creditProfile.trustScore) : "-"}
                    detail="Score"
                    tone={creditProfile ? "verify" : "neutral"}
                  />
                  <Metric
                    label="Limit"
                    value={creditProfile ? formatCurrency(creditProfile.recommendedLimit) : "-"}
                    detail="Suggested"
                    tone={creditProfile ? "verify" : "neutral"}
                  />
                  <div className="min-w-0 rounded-2xl border border-zinc-200/70 bg-zinc-50/80 p-3 dark:border-zinc-800/80 dark:bg-zinc-900/35">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-500 dark:text-zinc-400">
                      Drivers
                    </div>
                    <div className="mt-2 space-y-1">
                      {(creditProfile?.drivers.length
                        ? creditProfile.drivers.slice(0, 3)
                        : ["No credit profile yet."]
                      ).map((driver) => (
                        <div
                          key={driver}
                          className="truncate text-xs text-zinc-700 dark:text-zinc-200"
                        >
                          {driver}
                        </div>
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
                    />
                    <Metric
                      label="Converted"
                      value={String(referrals?.convertedReferrals ?? 0)}
                      detail={`${referrals?.totalReferrals ?? 0} total`}
                      tone={(referrals?.convertedReferrals ?? 0) > 0 ? "verify" : "neutral"}
                    />
                  </div>
                  <div className="mt-3 rounded-xl bg-zinc-50/85 px-3 py-2 font-mono text-[11px] text-zinc-700 dark:bg-zinc-900/35 dark:text-zinc-200">
                    <div className="truncate">
                      {referrals?.referralUrl || "Claim handle to activate"}
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
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
                  <DataRow
                    label="Status"
                    value={listing ? listing.listing.status.replace("_", " ") : eligibilityText(marketplaceEligibility)}
                  />
                  <DataRow label="Offers" value={listing ? String(listing.offers.length) : "0"} />
                  <DataRow
                    label="Ask"
                    value={listing ? formatCurrency(listing.listing.askAmount) : "Not listed"}
                  />
                  <div className="mt-3 flex flex-wrap gap-2">
                    <ActionLink href="/marketplace">Open</ActionLink>
                    {claim ? <ActionLink href={`/marketplace/${claim.handle}`}>Listing</ActionLink> : null}
                  </div>
                </Panel>
              </div>
            </section>
          </div>
        </Container>
      </main>
    </div>
  );
}
