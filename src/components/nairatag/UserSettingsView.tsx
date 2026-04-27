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
  UserRecord,
} from "@/lib/adminTypes";
import {
  DEFAULT_SETTINGS_NOTIFICATION_PREFERENCES,
  readSettingsNotificationPreferences,
  writeSettingsNotificationPreferences,
  type SettingsNotificationPreferences,
} from "@/lib/settingsPreferences";
import { AppPageHeader } from "./AppPageHeader";
import { CopyButton } from "./CopyButton";
import { TelegramLinkingCard } from "./TelegramLinkingCard";
import { useToast } from "./ToastProvider";
import { Badge, Container, cn } from "./ui";

const NAIRA = "\u20A6";

type NotificationSummary = {
  total: number;
  unread: number;
};

export type UserSettingsData = {
  user: UserRecord;
  claim: ClaimRecord | null;
  bankAccount: BankAccountRecord | null;
  cryptoWallet: CryptoWalletRecord | null;
  notifications: NotificationSummary;
};

type SettingsTab = "profile" | "notifications" | "payments" | "security" | "telegram";

const SETTINGS_TABS: Array<{
  id: SettingsTab;
  label: string;
  shortLabel: string;
  description: string;
}> = [
  {
    id: "profile",
    label: "Profile",
    shortLabel: "Profile",
    description: "Name, handle, avatar.",
  },
  {
    id: "notifications",
    label: "Notifications",
    shortLabel: "Alerts",
    description: "Live alerts and inbox.",
  },
  {
    id: "payments",
    label: "Payments",
    shortLabel: "Payments",
    description: "Payouts, wallets, PayLinks.",
  },
  {
    id: "security",
    label: "Security",
    shortLabel: "Security",
    description: "Verification checks.",
  },
  {
    id: "telegram",
    label: "Telegram",
    shortLabel: "Telegram",
    description: "Link and publish.",
  },
];

function displayName(user: UserRecord, claim: ClaimRecord | null) {
  if (claim?.displayName && !/^pending verification$/i.test(claim.displayName)) {
    return claim.displayName;
  }
  return user.fullName || user.phone || "NairaTag user";
}

function initials(user: UserRecord, claim: ClaimRecord | null) {
  const source = displayName(user, claim);
  const value = source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  return /^[A-Z0-9]{1,2}$/.test(value) ? value : "NT";
}

function maskWallet(value?: string) {
  if (!value) return "Not linked";
  if (value.length <= 12) return value;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function formatDate(value?: string | null) {
  if (!value) return "Not set";
  return new Date(value).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function humanizeError(value: string) {
  return value.replaceAll("_", " ");
}

function normalizeSettingsTab(hash?: string | null): SettingsTab {
  const value = (hash || "").replace(/^#/u, "").trim().toLowerCase();
  if (value === "notifications") return "notifications";
  if (value === "payments") return "payments";
  if (value === "security") return "security";
  if (value === "telegram" || value === "telegram-linking") return "telegram";
  return "profile";
}

function tabHash(tab: SettingsTab) {
  return tab === "telegram" ? "telegram-linking" : tab;
}

function fileToAvatarDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("image_required"));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      reject(new Error("avatar_too_large"));
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      const canvas = document.createElement("canvas");
      const maxSize = 600;
      const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));

      const context = canvas.getContext("2d");
      if (!context) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("image_upload_failed"));
        return;
      }

      context.drawImage(image, 0, 0, canvas.width, canvas.height);
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

function SectionPanel({
  children,
  className,
  tone = "white",
  id,
}: {
  children: ReactNode;
  className?: string;
  tone?: "white" | "soft";
  id?: string;
}) {
  return (
    <section
      id={id}
      className={cn(
        "rounded-[1.6rem] border shadow-[0_16px_40px_rgba(15,23,42,0.06)] dark:shadow-[0_20px_44px_rgba(0,0,0,0.24)]",
        tone === "soft"
          ? "border-zinc-200/65 bg-[#f7f8fc] dark:border-zinc-800/80 dark:bg-zinc-900/55"
          : "border-zinc-200/75 bg-white/92 dark:border-zinc-800/80 dark:bg-zinc-950/50",
        className
      )}
    >
      {children}
    </section>
  );
}

function SectionTitle({
  eyebrow,
  title,
  description,
  trailing,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  trailing?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        {eyebrow ? (
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
            {eyebrow}
          </div>
        ) : null}
        <h2 className="mt-1 text-lg font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-xl">
          {title}
        </h2>
        {description ? (
          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-300">
            {description}
          </p>
        ) : null}
      </div>
      {trailing}
    </div>
  );
}

function SidebarNavButton({
  active,
  label,
  detail,
  onClick,
  badge,
}: {
  active: boolean;
  label: string;
  detail?: string;
  onClick: () => void;
  badge?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-2xl border px-3.5 py-3 text-left transition",
        active
          ? "border-zinc-200 bg-white text-zinc-950 shadow-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
          : "border-transparent bg-transparent text-zinc-600 hover:border-zinc-200 hover:bg-white/70 hover:text-zinc-950 dark:text-zinc-300 dark:hover:border-zinc-800 dark:hover:bg-zinc-950/60 dark:hover:text-zinc-50"
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold">{label}</div>
          {detail && active ? (
            <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{detail}</div>
          ) : null}
        </div>
        {badge}
      </div>
    </button>
  );
}

function TopTabButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-9 shrink-0 items-center rounded-xl px-3 text-sm font-semibold transition",
        active
          ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
          : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-zinc-50"
      )}
    >
      {label}
    </button>
  );
}

function ToggleSwitch({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onChange}
      className={cn(
        "relative inline-flex h-7 w-12 items-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-50",
        checked
          ? "bg-indigo-500 shadow-[inset_0_0_0_1px_rgba(79,70,229,0.2)]"
          : "bg-zinc-200 shadow-[inset_0_0_0_1px_rgba(15,23,42,0.08)] dark:bg-zinc-800"
      )}
    >
      <span
        className={cn(
          "ml-1 block h-5 w-5 rounded-full bg-white shadow-sm transition",
          checked ? "translate-x-5" : "translate-x-0"
        )}
      />
    </button>
  );
}

function ToggleRow({
  label,
  detail,
  checked,
  onChange,
  disabled,
  badge,
}: {
  label: string;
  detail: string;
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  badge?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-[1.35rem] border border-zinc-200/75 bg-white/85 px-4 py-4 dark:border-zinc-800/80 dark:bg-zinc-950/35">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">{label}</div>
          {badge}
        </div>
        <div className="mt-1 max-w-xl text-xs leading-5 text-zinc-600 dark:text-zinc-300">
          {detail}
        </div>
      </div>
      <ToggleSwitch checked={checked} onChange={onChange} disabled={disabled} />
    </div>
  );
}

function InfoRow({
  label,
  value,
  detail,
  trailing,
}: {
  label: string;
  value: string;
  detail?: string;
  trailing?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 rounded-[1.35rem] border border-zinc-200/75 bg-white/85 px-4 py-4 dark:border-zinc-800/80 dark:bg-zinc-950/35">
      <div className="min-w-0">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
          {label}
        </div>
        <div className="mt-1 text-sm font-semibold text-zinc-950 dark:text-zinc-50">{value}</div>
        {detail ? (
          <div className="mt-1 text-xs leading-5 text-zinc-600 dark:text-zinc-300">{detail}</div>
        ) : null}
      </div>
      {trailing ? <div className="shrink-0">{trailing}</div> : null}
    </div>
  );
}

function QuickLink({
  href,
  label,
  detail,
}: {
  href: string;
  label: string;
  detail: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-3 rounded-2xl border border-transparent px-3 py-3 transition hover:border-zinc-200 hover:bg-white/80 dark:hover:border-zinc-800 dark:hover:bg-zinc-950/45"
    >
      <div className="min-w-0">
        <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">{label}</div>
        <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{detail}</div>
      </div>
      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-zinc-400" aria-hidden="true">
        <path
          d="m9 6 6 6-6 6"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </Link>
  );
}

function MobileTabSelect({
  value,
  onChange,
}: {
  value: SettingsTab;
  onChange: (tab: SettingsTab) => void;
}) {
  return (
    <label className="block xl:hidden">
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
        Open section
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as SettingsTab)}
        className="mt-2 h-11 w-full rounded-2xl border border-zinc-200/80 bg-white px-3.5 text-sm font-semibold text-zinc-950 outline-none dark:border-zinc-800/80 dark:bg-zinc-950/55 dark:text-zinc-50"
      >
        {SETTINGS_TABS.map((tab) => (
          <option key={tab.id} value={tab.id}>
            {tab.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function SignInState() {
  return (
    <div className="min-h-screen bg-[#eef1f7] text-zinc-950 transition-colors dark:bg-zinc-950 dark:text-zinc-50">
      <AppPageHeader ctaHref="/claim" ctaLabel={`Claim ${NAIRA}handle`} />
      <main className="py-5 sm:py-7">
        <Container className="max-w-3xl">
          <SectionPanel className="p-5 sm:p-6">
        <SectionTitle
          eyebrow="Settings"
          title="Sign in to manage your account."
          description="Profile, payouts, Telegram, and alerts live here."
        />
            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <AuthModalButton afterAuthHref="/settings" variant="primary">
                Sign in
              </AuthModalButton>
              <Link
                href="/dashboard"
                className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-300/70 bg-white/80 px-4 text-sm font-semibold text-zinc-950 transition hover:bg-white dark:border-zinc-700/80 dark:bg-zinc-950/30 dark:text-zinc-50"
              >
                Dashboard
              </Link>
            </div>
          </SectionPanel>
        </Container>
      </main>
    </div>
  );
}

export function UserSettingsView({
  data,
}: {
  data: UserSettingsData | null;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [fullName, setFullName] = useState(data ? displayName(data.user, data.claim) : "");
  const [handle, setHandle] = useState(data?.claim?.handle ?? "");
  const [avatarUrl, setAvatarUrl] = useState(data?.user.avatarUrl ?? "");
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const [notificationPrefs, setNotificationPrefs] = useState<SettingsNotificationPreferences>(
    DEFAULT_SETTINGS_NOTIFICATION_PREFERENCES
  );
  const [prefsReady, setPrefsReady] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const applyHashTab = () => {
      setActiveTab(normalizeSettingsTab(window.location.hash));
    };

    applyHashTab();
    window.addEventListener("hashchange", applyHashTab);
    return () => window.removeEventListener("hashchange", applyHashTab);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setNotificationPrefs(readSettingsNotificationPreferences(window.localStorage));
    setPrefsReady(true);
  }, []);

  useEffect(() => {
    if (!prefsReady || typeof window === "undefined") return;
    writeSettingsNotificationPreferences(notificationPrefs, window.localStorage);
  }, [notificationPrefs, prefsReady]);

  if (!data) return <SignInState />;

  const { user, claim, bankAccount, cryptoWallet, notifications } = data;
  const name = displayName(user, claim);
  const claimLabel = claim ? `${NAIRA}${claim.handle}` : "Handle not claimed";
  const publicPath = claim ? `/h/${claim.handle}` : "/claim";
  const payPagePath = claim ? `/pay/${claim.handle}` : "/claim";
  const createPayLinkPath = "/pay/create";
  const paylinksDashboardPath = "/dashboard/paylinks";
  const walletLabel = maskWallet(cryptoWallet?.walletAddress);
  const currentTabMeta =
    SETTINGS_TABS.find((tab) => tab.id === activeTab) ?? SETTINGS_TABS[0];

  function selectTab(tab: SettingsTab) {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      const next = `#${tabHash(tab)}`;
      window.history.replaceState(null, "", next);
    }
  }

  function updateNotificationPref<K extends keyof SettingsNotificationPreferences>(
    key: K,
    value: SettingsNotificationPreferences[K]
  ) {
    setNotificationPrefs((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function selectAvatarFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const nextAvatar = await fileToAvatarDataUrl(file);
      setAvatarUrl(nextAvatar);
      toast({
        title: "Image ready",
        description: "Your avatar will update when you save changes.",
        tone: "info",
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: humanizeError(
          error instanceof Error ? error.message : "image_upload_failed"
        ),
        tone: "error",
      });
    }
  }

  function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

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

        toast({
          title: "Profile saved",
          description: "Your account settings are now up to date.",
          tone: "success",
        });
        router.refresh();
      } catch (error) {
        toast({
          title: "Save failed",
          description: humanizeError(
            error instanceof Error ? error.message : "profile_update_failed"
          ),
          tone: "error",
        });
      }
    });
  }

  const profilePanel = (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <SectionPanel className="p-5 sm:p-6">
        <SectionTitle
          eyebrow="Public profile"
          title="Edit the identity people pay."
          description="This controls the name, handle, and image that appear across your public handle card and payment surfaces."
        />

        <form onSubmit={saveProfile} className="mt-5 space-y-4">
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
              Handle
            </span>
            <div className="mt-2 flex h-12 rounded-2xl border border-zinc-200/80 bg-white/85 dark:border-zinc-800/80 dark:bg-zinc-950/40">
              <span className="grid w-11 place-items-center border-r border-zinc-200/70 text-sm font-semibold text-emerald-700 dark:border-zinc-800/70 dark:text-emerald-300">
                {NAIRA}
              </span>
              <input
                value={handle}
                onChange={(event) =>
                  setHandle(event.target.value.replace(/[^\w.]/g, "").toLowerCase())
                }
                maxLength={32}
                placeholder="yourname"
                disabled={!claim || isPending}
                className="min-w-0 flex-1 bg-transparent px-3.5 text-sm font-semibold text-zinc-950 outline-none placeholder:text-zinc-400 disabled:opacity-60 dark:text-zinc-50"
              />
            </div>
          </label>

          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
              Public name
            </span>
            <input
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              maxLength={80}
              placeholder="Your public name"
              disabled={isPending}
              className="mt-2 h-12 w-full rounded-2xl border border-zinc-200/80 bg-white/85 px-3.5 text-sm font-semibold text-zinc-950 outline-none placeholder:text-zinc-400 disabled:opacity-60 dark:border-zinc-800/80 dark:bg-zinc-950/40 dark:text-zinc-50"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-[auto_minmax(0,1fr)]">
            <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-[1.4rem] bg-zinc-950 text-lg font-semibold text-white dark:bg-white dark:text-zinc-950">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                initials(user, claim)
              )}
            </div>
            <div className="space-y-3">
              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
                  Avatar
                </span>
                <input
                  value={avatarUrl}
                  onChange={(event) => setAvatarUrl(event.target.value)}
                  placeholder="Image URL or upload"
                  disabled={isPending}
                  className="mt-2 h-12 w-full rounded-2xl border border-zinc-200/80 bg-white/85 px-3.5 text-sm font-semibold text-zinc-950 outline-none placeholder:text-zinc-400 disabled:opacity-60 dark:border-zinc-800/80 dark:bg-zinc-950/40 dark:text-zinc-50"
                />
              </label>

              <div className="flex flex-wrap gap-2">
                <label className="inline-flex h-9 cursor-pointer items-center justify-center rounded-xl border border-zinc-300/70 bg-white/80 px-3.5 text-xs font-semibold text-zinc-950 transition hover:bg-white dark:border-zinc-700/80 dark:bg-zinc-950/30 dark:text-zinc-50">
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
                  className="h-9 rounded-xl border border-zinc-300/70 bg-white/80 px-3.5 text-xs font-semibold text-zinc-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700/80 dark:bg-zinc-950/30 dark:text-zinc-50"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="text-xs leading-5 text-zinc-500 dark:text-zinc-400">
              Changes sync to your account card, public handle, and share surfaces together.
            </div>
            <button
              type="submit"
              disabled={isPending}
              className="h-10 rounded-xl bg-nt-orange px-4 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      </SectionPanel>

      <div className="space-y-4">
        <SectionPanel tone="soft" className="p-5">
        <SectionTitle
          eyebrow="Live surfaces"
          title="Where this identity shows up."
          description="Open the main public touchpoints tied to your handle."
        />
          <div className="mt-4 space-y-3">
            <InfoRow
              label="Public profile"
              value={claim ? publicPath : "Claim your handle first"}
              detail="Your trust card, QR, and public handle page."
              trailing={
                <Link
                  href={publicPath}
                  className="inline-flex h-9 items-center justify-center rounded-xl border border-zinc-300/70 bg-white/80 px-3 text-xs font-semibold text-zinc-950 transition hover:bg-white dark:border-zinc-700/80 dark:bg-zinc-950/30 dark:text-zinc-50"
                >
                  Open
                </Link>
              }
            />
            <InfoRow
              label="Pay page"
              value={claim ? payPagePath : "Claim your handle first"}
              detail="The direct payment page behind your identity."
              trailing={
                <Link
                  href={payPagePath}
                  className="inline-flex h-9 items-center justify-center rounded-xl border border-zinc-300/70 bg-white/80 px-3 text-xs font-semibold text-zinc-950 transition hover:bg-white dark:border-zinc-700/80 dark:bg-zinc-950/30 dark:text-zinc-50"
                >
                  Open
                </Link>
              }
            />
            <InfoRow
              label="Theme"
              value="Light / dark"
              detail="Switch the full product feel instantly."
              trailing={
                <ThemeToggle
                  size="compact"
                  className="border-zinc-200 bg-white text-zinc-700 shadow-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                />
              }
            />
          </div>
        </SectionPanel>

        <SectionPanel tone="soft" className="p-5">
        <SectionTitle
          eyebrow="Compact facts"
          title="Your account at a glance."
          description="What is already linked and live."
        />
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <InfoRow
              label="Member since"
              value={formatDate(user.createdAt)}
              detail="When this NairaTag account first went live."
            />
            <InfoRow
              label="Points"
              value={`${(user.pointsBalance ?? 0).toLocaleString()} pts`}
              detail="Welcome rewards and referral bonuses."
            />
          </div>
        </SectionPanel>
      </div>
    </div>
  );

  const notificationsPanel = (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <SectionPanel className="p-5 sm:p-6" id="notifications">
        <SectionTitle
          eyebrow="Notification settings"
          title="Keep live alerts useful, not noisy."
          description="Control the floating toasts you see while NairaTag is open."
        />

        <div className="mt-5 space-y-3">
          <ToggleRow
            label="Live toasts"
            detail="Master switch for floating notifications across the signed-in app."
            checked={notificationPrefs.liveToasts}
            onChange={() =>
              updateNotificationPref("liveToasts", !notificationPrefs.liveToasts)
            }
            badge={<Badge tone="neutral">app-wide</Badge>}
          />
          <ToggleRow
            label="Payment alerts"
            detail="PayLink creation, receipts, refunds, payout movement, and settlement changes."
            checked={notificationPrefs.paymentToasts}
            disabled={!notificationPrefs.liveToasts}
            onChange={() =>
              updateNotificationPref("paymentToasts", !notificationPrefs.paymentToasts)
            }
          />
          <ToggleRow
            label="Activity alerts"
            detail="Marketplace offers, listing changes, sales, and referral progress."
            checked={notificationPrefs.activityToasts}
            disabled={!notificationPrefs.liveToasts}
            onChange={() =>
              updateNotificationPref("activityToasts", !notificationPrefs.activityToasts)
            }
          />
          <ToggleRow
            label="Account alerts"
            detail="Handle claims, bank linking, Telegram verification, and account-level updates."
            checked={notificationPrefs.accountToasts}
            disabled={!notificationPrefs.liveToasts}
            onChange={() =>
              updateNotificationPref("accountToasts", !notificationPrefs.accountToasts)
            }
          />
        </div>
      </SectionPanel>

      <div className="space-y-4">
        <SectionPanel tone="soft" className="p-5">
        <SectionTitle
          eyebrow="Inbox"
          title="Stored notifications"
          description="Your inbox keeps the full notification history."
        />
          <div className="mt-4 grid gap-3">
            <InfoRow
              label="Unread"
              value={notifications.unread.toLocaleString()}
              detail="New alerts waiting in your notifications inbox."
              trailing={<Badge tone={notifications.unread > 0 ? "orange" : "neutral"}>{notifications.unread > 0 ? "needs review" : "clear"}</Badge>}
            />
            <InfoRow
              label="Stored"
              value={notifications.total.toLocaleString()}
              detail="All notification records currently attached to your account."
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/notifications"
              className="inline-flex h-9 items-center justify-center rounded-xl bg-zinc-950 px-3.5 text-xs font-semibold text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              Open inbox
            </Link>
            <Link
              href="/notifications"
              className="inline-flex h-9 items-center justify-center rounded-xl border border-zinc-300/70 bg-white/80 px-3.5 text-xs font-semibold text-zinc-950 transition hover:bg-white dark:border-zinc-700/80 dark:bg-zinc-950/30 dark:text-zinc-50"
            >
              Manage read status
            </Link>
          </div>
        </SectionPanel>

      </div>
    </div>
  );

  const paymentsPanel = (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <SectionPanel className="p-5 sm:p-6">
        <SectionTitle
          eyebrow="Payments"
          title="Everything tied to getting paid."
          description="Banks, wallets, pay pages, and PayLinks."
        />

        <div className="mt-5 grid gap-3">
          <InfoRow
            label="Payout bank"
            value={
              bankAccount
                ? `${bankAccount.bankName} ${bankAccount.accountNumberMasked}`
                : "No bank account linked yet"
            }
            detail="This destination powers fiat settlement and hosted PayLink payouts."
            trailing={
              <Badge tone={bankAccount ? "verify" : "orange"}>
                {bankAccount ? "ready" : "needed"}
              </Badge>
            }
          />
          <InfoRow
            label="Base wallet"
            value={walletLabel}
            detail="Used for ENS-aware flows, crypto sends, and wallet-linked identity."
            trailing={
              <Badge tone={cryptoWallet?.walletVerified ? "verify" : "neutral"}>
                {cryptoWallet?.walletVerified ? "verified" : "pending"}
              </Badge>
            }
          />
          <InfoRow
            label="Pay page"
            value={claim ? payPagePath : "Claim your handle first"}
            detail="Share this when you want someone to pay your handle directly."
            trailing={
              <Link
                href={payPagePath}
                className="inline-flex h-9 items-center justify-center rounded-xl border border-zinc-300/70 bg-white/80 px-3 text-xs font-semibold text-zinc-950 transition hover:bg-white dark:border-zinc-700/80 dark:bg-zinc-950/30 dark:text-zinc-50"
              >
                Open
              </Link>
            }
          />
        </div>
      </SectionPanel>

      <div className="space-y-4">
        <SectionPanel tone="soft" className="p-5">
        <SectionTitle
          eyebrow="PayLinks"
          title="Create or manage links."
          description="Jump into create or manager."
        />
          <div className="mt-4 space-y-2">
            <QuickLink
              href={createPayLinkPath}
              label="Create PayLink"
              detail="The quick creator with QR, share, and copy actions."
            />
            <QuickLink
              href={paylinksDashboardPath}
              label="PayLinks dashboard"
              detail="Receipts, refunds, settlements, and link management."
            />
          </div>
        </SectionPanel>

        <SectionPanel tone="soft" className="p-5">
        <SectionTitle
          eyebrow="More routes"
          title="Payment shortcuts"
          description="Other money surfaces connected to your account."
        />
          <div className="mt-4 space-y-2">
            <QuickLink
              href="/send/crypto"
              label="Send crypto"
              detail="Resolve wallets, handles, and ENS destinations."
            />
            <QuickLink
              href="/notifications"
              label="Recent payments"
              detail="Check the inbox for receipts, settlement, and payout movement."
            />
          </div>
        </SectionPanel>
      </div>
    </div>
  );

  const securityPanel = (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <SectionPanel className="p-5 sm:p-6">
        <SectionTitle
          eyebrow="Security"
          title="See the checks protecting this account."
          description="Verification signals tied to payouts, handle, and wallet."
        />

        <div className="mt-5 grid gap-3">
          <InfoRow
            label="Phone verification"
            value={formatDate(user.phoneVerifiedAt)}
            detail="Your phone session is the base identity layer for sign-in and recovery."
            trailing={<Badge tone="verify">verified</Badge>}
          />
          <InfoRow
            label="Handle status"
            value={claim ? `${NAIRA}${claim.handle}` : "Handle not claimed"}
            detail={
              claim
                ? `Verification status: ${claim.verification}`
                : "Claim a NairaTag handle to go live publicly."
            }
            trailing={
              <Badge tone={claim ? "verify" : "orange"}>
                {claim ? claim.verification : "needed"}
              </Badge>
            }
          />
          <InfoRow
            label="BVN"
            value={user.bvnLinkedAt ? `Linked ${formatDate(user.bvnLinkedAt)}` : "Not linked"}
            detail="BVN strengthens payout trust and verification on your handle."
            trailing={
              <Badge tone={user.bvnLinkedAt ? "verify" : "orange"}>
                {user.bvnLinkedAt ? "linked" : "needed"}
              </Badge>
            }
          />
          <InfoRow
            label="Linked wallet"
            value={walletLabel}
            detail="Wallet ownership matters for ENS publishing and crypto-aware identity flows."
            trailing={
              <Badge tone={cryptoWallet?.walletVerified ? "verify" : "neutral"}>
                {cryptoWallet?.walletVerified ? "verified" : "pending"}
              </Badge>
            }
          />
          <InfoRow
            label="Privy session"
            value={user.privyLinkedAt ? formatDate(user.privyLinkedAt) : "Not linked"}
            detail="Wallet or email sign-in linked through Privy for easier account access."
            trailing={
              <Badge tone={user.privyLinkedAt ? "verify" : "neutral"}>
                {user.privyLinkedAt ? "linked" : "optional"}
              </Badge>
            }
          />
        </div>
      </SectionPanel>

      <div className="space-y-4">
        <SectionPanel tone="soft" className="p-5">
        <SectionTitle
          eyebrow="Quick actions"
          title="Strengthen the account."
          description="The next moves that make this identity safer."
        />
          <div className="mt-4 space-y-2">
            {!claim ? (
              <QuickLink
                href="/claim"
                label={`Claim ${NAIRA}handle`}
                detail="Create the public identity all your settings connect to."
              />
            ) : null}
            {!bankAccount ? (
              <QuickLink
                href="/settings#payments"
                label="Link payout bank"
                detail="Complete fiat payout routing before sharing PayLinks."
              />
            ) : null}
            {!user.bvnLinkedAt ? (
              <QuickLink
                href="/dashboard"
                label="Complete verification"
                detail="Finish the stronger trust checks behind your handle."
              />
            ) : null}
            <QuickLink
              href="/marketplace"
              label="Open marketplace"
              detail="Track offers, listings, and recent handle activity."
            />
          </div>
        </SectionPanel>
      </div>
    </div>
  );

  const telegramPanel = (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div id="telegram-linking">
        <TelegramLinkingCard claim={claim} />
      </div>

      <div className="space-y-4">
        <SectionPanel tone="soft" className="p-5">
        <SectionTitle
          eyebrow="Telegram flow"
          title="How this connection works."
          description="Verify in the bot, then publish into ENS from the right wallet."
        />
          <div className="mt-4 space-y-3">
            <InfoRow
              label="Bot"
              value="@MyNairatagbot"
              detail="Used for verification, claim shortcuts, receive actions, and Telegram-first lookup."
            />
            <InfoRow
              label="ENS text record"
              value="org.telegram"
              detail="The public field NairaTag writes once the Telegram alias is verified and wallet-signed."
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="https://t.me/MyNairatagbot"
              target="_blank"
              className="inline-flex h-9 items-center justify-center rounded-xl bg-zinc-950 px-3.5 text-xs font-semibold text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              Open bot
            </Link>
            <Link
              href="/claim"
              className="inline-flex h-9 items-center justify-center rounded-xl border border-zinc-300/70 bg-white/80 px-3.5 text-xs font-semibold text-zinc-950 transition hover:bg-white dark:border-zinc-700/80 dark:bg-zinc-950/30 dark:text-zinc-50"
            >
              Claim on web
            </Link>
          </div>
        </SectionPanel>
      </div>
    </div>
  );

  const activePanel =
    activeTab === "notifications"
      ? notificationsPanel
      : activeTab === "payments"
        ? paymentsPanel
        : activeTab === "security"
          ? securityPanel
          : activeTab === "telegram"
            ? telegramPanel
            : profilePanel;

  return (
    <div className="min-h-screen bg-[#eef1f7] text-zinc-950 transition-colors dark:bg-zinc-950 dark:text-zinc-50">
      <AppPageHeader ctaHref="/dashboard" ctaLabel="Dashboard" />

      <main className="py-4 sm:py-6">
        <Container className="max-w-7xl">
          <div className="grid gap-4 xl:grid-cols-[18.5rem_minmax(0,1fr)]">
            <aside className="hidden xl:block">
              <div className="sticky top-24 space-y-4">
                <SectionPanel tone="soft" className="overflow-hidden">
                  <div className="h-24 bg-gradient-to-r from-indigo-200 via-white to-emerald-100 dark:from-indigo-950 dark:via-zinc-950 dark:to-emerald-950" />
                  <div className="px-4 pb-4">
                    <div className="-mt-9 flex items-end gap-3">
                      <div className="grid h-[4.5rem] w-[4.5rem] place-items-center overflow-hidden rounded-[1.45rem] border-4 border-white bg-zinc-950 text-lg font-semibold text-white dark:border-zinc-950 dark:bg-white dark:text-zinc-950">
                        {avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          initials(user, claim)
                        )}
                      </div>
                      <div className="min-w-0 pb-1">
                        <div className="truncate text-lg font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                          {name}
                        </div>
                        <div className="mt-1 truncate text-sm text-zinc-600 dark:text-zinc-300">
                          {user.email || user.phone}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Badge tone={claim ? "verify" : "orange"}>{claim ? claim.verification : "claim handle"}</Badge>
                      <Badge tone={bankAccount ? "verify" : "orange"}>
                        {bankAccount ? "payout linked" : "payout needed"}
                      </Badge>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <CopyButton
                        value={claim ? `${NAIRA}${claim.handle}` : user.phone}
                        label="Copy ID"
                        copiedLabel="Copied"
                        className="h-9 rounded-xl px-3 py-0 text-xs"
                      />
                      <Link
                        href={publicPath}
                        className="inline-flex h-9 items-center justify-center rounded-xl border border-zinc-300/70 bg-white/80 px-3 text-xs font-semibold text-zinc-950 transition hover:bg-white dark:border-zinc-700/80 dark:bg-zinc-950/30 dark:text-zinc-50"
                      >
                        {claim ? "Open profile" : "Claim handle"}
                      </Link>
                    </div>
                  </div>
                </SectionPanel>

                <SectionPanel tone="soft" className="p-3">
                  <div className="px-1 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
                    Settings
                  </div>
                  <div className="space-y-1">
                    {SETTINGS_TABS.map((tab) => (
                      <SidebarNavButton
                        key={tab.id}
                        active={activeTab === tab.id}
                        label={tab.label}
                        detail={tab.description}
                        onClick={() => selectTab(tab.id)}
                        badge={
                          tab.id === "notifications" && notifications.unread > 0 ? (
                            <Badge tone="orange" className="px-2 py-0.5 text-[10px]">
                              {notifications.unread}
                            </Badge>
                          ) : null
                        }
                      />
                    ))}
                  </div>
                </SectionPanel>

              </div>
            </aside>

            <div className="space-y-4">
              <SectionPanel className="overflow-hidden">
                <div className="border-b border-zinc-200/75 px-4 py-4 dark:border-zinc-800/80 sm:px-6">
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-600 transition hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-zinc-50"
                  >
                    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                      <path
                        d="m15 6-6 6 6 6"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    Back to dashboard
                  </Link>
                  <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone="neutral" className="px-2 py-0.5 text-[11px]">
                          {claimLabel}
                        </Badge>
                        <Badge tone="verify" className="px-2 py-0.5 text-[11px]">
                          {currentTabMeta.shortLabel}
                        </Badge>
                      </div>
                      <h1 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-3xl">
                        Settings
                      </h1>
                      <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                        {currentTabMeta.description}
                      </p>
                    </div>
                    <div className="hidden shrink-0 items-center gap-2 sm:flex">
                      <ThemeToggle
                        size="dense"
                        className="border-zinc-200 bg-white text-zinc-700 shadow-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                      />
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl border border-zinc-200/70 bg-[#f6f7fb] p-3 dark:border-zinc-800/80 dark:bg-zinc-900/55 xl:hidden">
                    <div className="flex items-center gap-3">
                      <div className="grid h-12 w-12 place-items-center overflow-hidden rounded-[1rem] bg-zinc-950 text-sm font-semibold text-white dark:bg-white dark:text-zinc-950">
                        {avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          initials(user, claim)
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                          {name}
                        </div>
                        <div className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
                          {user.email || user.phone}
                        </div>
                      </div>
                      <ThemeToggle
                        size="compact"
                        className="border-zinc-200 bg-white text-zinc-700 shadow-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 sm:hidden"
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <MobileTabSelect value={activeTab} onChange={selectTab} />
                    <div className="mt-4 hidden overflow-x-auto xl:block">
                      <div className="flex min-w-max items-center gap-1 rounded-2xl bg-[#f6f7fb] p-1.5 dark:bg-zinc-900/55">
                        {SETTINGS_TABS.map((tab) => (
                          <TopTabButton
                            key={tab.id}
                            active={activeTab === tab.id}
                            label={tab.label}
                            onClick={() => selectTab(tab.id)}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </SectionPanel>

              {activePanel}
            </div>
          </div>
        </Container>
      </main>
    </div>
  );
}
