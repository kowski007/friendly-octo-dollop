"use client";

import { useRouter } from "next/navigation";
import {
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
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

function SectionCard({
  title,
  description,
  children,
  className,
  id,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={cn(
        "rounded-[1.7rem] border border-zinc-200/75 bg-white/90 p-4 shadow-[0_16px_42px_rgba(15,23,42,0.06)] dark:border-zinc-800/80 dark:bg-zinc-950/45 dark:shadow-[0_20px_48px_rgba(0,0,0,0.22)]",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            {title}
          </h2>
          {description ? (
            <p className="mt-1 text-xs leading-5 text-zinc-600 dark:text-zinc-300">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function RowIcon({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "orange" | "verify";
}) {
  return (
    <div
      className={cn(
        "grid h-10 w-10 shrink-0 place-items-center rounded-2xl",
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

function RowChevron() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
      <path
        d="m9 6 6 6-6 6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SettingsLinkRow({
  href,
  icon,
  label,
  detail,
  trailing,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  detail?: string;
  trailing?: ReactNode;
}) {
  return (
    <a
      href={href}
      className="flex items-center gap-3 rounded-2xl px-3 py-3 transition hover:bg-zinc-50 dark:hover:bg-zinc-900/70"
    >
      {icon}
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">{label}</div>
        {detail ? (
          <div className="mt-0.5 truncate text-xs text-zinc-600 dark:text-zinc-300">
            {detail}
          </div>
        ) : null}
      </div>
      <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500 dark:text-zinc-300">
        {trailing}
        <RowChevron />
      </div>
    </a>
  );
}

function SettingsValueRow({
  icon,
  label,
  detail,
  trailing,
}: {
  icon: ReactNode;
  label: string;
  detail: string;
  trailing?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl px-3 py-3">
      {icon}
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">{label}</div>
        <div className="mt-0.5 truncate text-xs text-zinc-600 dark:text-zinc-300">
          {detail}
        </div>
      </div>
      {trailing ? (
        <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-300">{trailing}</div>
      ) : null}
    </div>
  );
}

function StatusPill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "verify" | "orange";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]",
        tone === "verify"
          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200"
          : tone === "orange"
            ? "bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-200"
            : "bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300"
      )}
    >
      {children}
    </span>
  );
}

function SignInState() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 transition-colors dark:bg-zinc-950 dark:text-zinc-50">
      <AppPageHeader ctaHref="/claim" ctaLabel="Claim a ₦handle" />
      <main className="py-6 sm:py-8">
        <Container className="max-w-3xl">
          <SectionCard
            title="Settings"
            description="Sign in to manage your account, notifications, and payment preferences."
          >
            <div className="flex flex-col gap-2 sm:flex-row">
              <AuthModalButton afterAuthHref="/settings" variant="primary">
                Sign in
              </AuthModalButton>
              <a
                href="/dashboard"
                className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-300/70 bg-white/80 px-4 text-sm font-semibold text-zinc-950 transition hover:bg-white dark:border-zinc-700/80 dark:bg-zinc-950/30 dark:text-zinc-50"
              >
                Dashboard
              </a>
            </div>
          </SectionCard>
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
  const [fullName, setFullName] = useState(
    data ? displayName(data.user, data.claim) : ""
  );
  const [handle, setHandle] = useState(data?.claim?.handle ?? "");
  const [avatarUrl, setAvatarUrl] = useState(data?.user.avatarUrl ?? "");
  const [isPending, startTransition] = useTransition();

  if (!data) return <SignInState />;

  const { user, claim, bankAccount, cryptoWallet, notifications } = data;
  const name = displayName(user, claim);
  const publicPath = claim ? `/h/${claim.handle}` : "/claim";
  const payPath = claim ? `/pay/${claim.handle}` : "/payments/payment-links";
  const claimLabel = claim ? `${NAIRA}${claim.handle}` : "Handle not claimed";

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

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 transition-colors dark:bg-zinc-950 dark:text-zinc-50">
      <AppPageHeader ctaHref="/dashboard" ctaLabel="Dashboard" />
      <main className="py-5 sm:py-6">
        <Container className="max-w-6xl space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <Badge tone="neutral" className="px-2 py-0.5 text-[11px]">
                {claimLabel}
              </Badge>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                Settings
              </h1>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                Keep profile, notifications, and payments tight across desktop and mobile.
              </p>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
            <div className="space-y-4">
              <section className="overflow-hidden rounded-[1.8rem] border border-zinc-200/75 bg-white/92 shadow-[0_20px_52px_rgba(15,23,42,0.08)] dark:border-zinc-800/80 dark:bg-zinc-950/45 dark:shadow-[0_22px_56px_rgba(0,0,0,0.26)]">
                <div className="h-24 bg-gradient-to-r from-orange-500 via-orange-100 to-emerald-100 dark:from-orange-600 dark:via-orange-950 dark:to-emerald-950" />
                <div className="px-4 pb-4">
                  <div className="-mt-10 flex items-end gap-3">
                    <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-[1.7rem] border-4 border-white bg-zinc-950 text-lg font-semibold text-white dark:border-zinc-950 dark:bg-white dark:text-zinc-950">
                      {avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        initials(user, claim)
                      )}
                    </div>
                    <div className="min-w-0 pb-1">
                      <div className="truncate text-xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                        {name}
                      </div>
                      <div className="mt-1 truncate text-sm text-zinc-600 dark:text-zinc-300">
                        {user.email || user.phone}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <StatusPill tone={claim ? "verify" : "orange"}>
                      {claim ? claim.verification : "claim handle"}
                    </StatusPill>
                    <StatusPill tone={bankAccount ? "verify" : "orange"}>
                      {bankAccount ? "payout linked" : "payout needed"}
                    </StatusPill>
                    <StatusPill tone={cryptoWallet?.walletVerified ? "verify" : "neutral"}>
                      {cryptoWallet?.walletVerified ? "wallet verified" : "wallet pending"}
                    </StatusPill>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <CopyButton value={claim ? `${NAIRA}${claim.handle}` : user.phone} label="Copy ID" />
                    <a
                      href={publicPath}
                      className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-300/70 bg-white/80 px-4 text-sm font-semibold text-zinc-950 transition hover:bg-white dark:border-zinc-700/80 dark:bg-zinc-950/30 dark:text-zinc-50"
                    >
                      {claim ? "Open public profile" : "Claim handle"}
                    </a>
                  </div>
                </div>
              </section>

              <SectionCard
                title="Manage profile"
                description="Update the public details that power your handle, pay page, and account identity."
              >
                <form onSubmit={saveProfile} className="space-y-3">
                  <label className="block">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-500 dark:text-zinc-400">
                      Handle
                    </span>
                    <div className="mt-1 flex rounded-2xl border border-zinc-200/80 bg-white/80 text-sm dark:border-zinc-800/80 dark:bg-zinc-950/40">
                      <span className="grid w-10 place-items-center border-r border-zinc-200/70 text-zinc-500 dark:border-zinc-800/70">
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
                        className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm font-semibold text-zinc-950 outline-none placeholder:text-zinc-400 disabled:opacity-60 dark:text-zinc-50"
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
                      className="mt-1 h-11 w-full rounded-2xl border border-zinc-200/80 bg-white/80 px-3 text-sm font-semibold text-zinc-950 outline-none placeholder:text-zinc-400 disabled:opacity-60 dark:border-zinc-800/80 dark:bg-zinc-950/40 dark:text-zinc-50"
                    />
                  </label>

                  <label className="block">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-500 dark:text-zinc-400">
                      Avatar
                    </span>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-2xl bg-zinc-950 text-sm font-semibold text-white dark:bg-white dark:text-zinc-950">
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
                        className="h-11 min-w-0 flex-1 rounded-2xl border border-zinc-200/80 bg-white/80 px-3 text-sm font-semibold text-zinc-950 outline-none placeholder:text-zinc-400 disabled:opacity-60 dark:border-zinc-800/80 dark:bg-zinc-950/40 dark:text-zinc-50"
                      />
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <label className="inline-flex h-9 cursor-pointer items-center justify-center rounded-xl border border-zinc-300/70 bg-white/80 px-3 text-xs font-semibold text-zinc-950 transition hover:bg-white dark:border-zinc-700/80 dark:bg-zinc-950/30 dark:text-zinc-50">
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
                        className="h-9 rounded-xl border border-zinc-300/70 bg-white/80 px-3 text-xs font-semibold text-zinc-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700/80 dark:bg-zinc-950/30 dark:text-zinc-50"
                      >
                        Remove
                      </button>
                    </div>
                  </label>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">
                      Changes update your account and public profile together.
                    </div>
                    <button
                      type="submit"
                      disabled={isPending}
                      className="h-10 rounded-xl bg-nt-orange px-4 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isPending ? "Saving" : "Save changes"}
                    </button>
                  </div>
                </form>
              </SectionCard>
            </div>

            <div className="space-y-4">
              <SectionCard
                title="Quick access"
                description="Jump into the parts of your account you use most often."
              >
                <div className="space-y-1">
                  <SettingsLinkRow
                    href="/notifications"
                    icon={
                      <RowIcon tone={notifications.unread > 0 ? "orange" : "neutral"}>
                        <svg viewBox="0 0 24 24" fill="none" className="h-4.5 w-4.5" aria-hidden="true">
                          <path
                            d="M8 18h8M10.5 21h3M6 18V11a6 6 0 1 1 12 0v7l1.5 1.5H4.5L6 18Z"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </RowIcon>
                    }
                    label="Notifications"
                    detail="Inbox and alert preferences"
                    trailing={
                      notifications.unread > 0 ? (
                        <StatusPill tone="orange">{notifications.unread} unread</StatusPill>
                      ) : (
                        <StatusPill>clear</StatusPill>
                      )
                    }
                  />
                  <SettingsLinkRow
                    href="/points"
                    icon={
                      <RowIcon tone={(user.pointsBalance ?? 0) > 0 ? "verify" : "neutral"}>
                        <svg viewBox="0 0 24 24" fill="none" className="h-4.5 w-4.5" aria-hidden="true">
                          <path
                            d="M12 4 14.2 8.5 19 9.2l-3.5 3.4.8 4.8-4.3-2.3-4.3 2.3.8-4.8L5 9.2l4.8-.7L12 4Z"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </RowIcon>
                    }
                    label="Points"
                    detail="Welcome rewards and referral bonuses"
                    trailing={<StatusPill>{(user.pointsBalance ?? 0).toLocaleString()} pts</StatusPill>}
                  />
                  <SettingsLinkRow
                    href={payPath}
                    icon={
                      <RowIcon tone="verify">
                        <svg viewBox="0 0 24 24" fill="none" className="h-4.5 w-4.5" aria-hidden="true">
                          <path
                            d="M4 8.5h16M6 5h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm9.5 8H18"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </RowIcon>
                    }
                    label={claim ? "Pay page" : "Payment links"}
                    detail="Hosted pay links and shareable payment pages"
                  />
                  <SettingsLinkRow
                    href="#telegram-linking"
                    icon={
                      <RowIcon tone="verify">
                        <svg viewBox="0 0 24 24" fill="none" className="h-4.5 w-4.5" aria-hidden="true">
                          <path
                            d="m20.5 4.6-2.8 13.1c-.2.9-.8 1.1-1.6.7l-4.2-3.1-2 1.9c-.2.2-.4.4-.8.4l.3-4.4 8-7.2c.4-.3-.1-.5-.5-.2l-9.9 6.2-4.2-1.3c-.9-.3-.9-.9.2-1.3l16.4-6.3c.8-.3 1.4.2 1.1 1.5Z"
                            stroke="currentColor"
                            strokeWidth="1.7"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </RowIcon>
                    }
                    label="Telegram"
                    detail="Link a verified Telegram username to your handle"
                    trailing={<StatusPill tone="verify">social</StatusPill>}
                  />
                  <SettingsLinkRow
                    href={publicPath}
                    icon={
                      <RowIcon>
                        <svg viewBox="0 0 24 24" fill="none" className="h-4.5 w-4.5" aria-hidden="true">
                          <path
                            d="M4 12c2.7-4.2 5.7-6.3 8-6.3s5.3 2.1 8 6.3c-2.7 4.2-5.7 6.3-8 6.3S6.7 16.2 4 12Z"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.8" />
                        </svg>
                      </RowIcon>
                    }
                    label={claim ? "Public profile" : "Claim handle"}
                    detail={claim ? "What people see when they open your handle" : "Finish setup and go live"}
                  />
                  <SettingsLinkRow
                    href="/marketplace"
                    icon={
                      <RowIcon>
                        <svg viewBox="0 0 24 24" fill="none" className="h-4.5 w-4.5" aria-hidden="true">
                          <path
                            d="M4 7h16l-1.5 10a2 2 0 0 1-2 1.7h-9a2 2 0 0 1-2-1.7L4 7Zm3-3 2 3m8-3-2 3"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </RowIcon>
                    }
                    label="Marketplace"
                    detail="Buy, sell, and monitor handle offers"
                  />
                </div>
              </SectionCard>

              <SectionCard
                id="notifications"
                title="Preferences"
                description="Keep appearance and inbox behavior compact and easy to control."
              >
                <div className="space-y-1">
                  <SettingsValueRow
                    icon={
                      <RowIcon tone="orange">
                        <svg viewBox="0 0 24 24" fill="none" className="h-4.5 w-4.5" aria-hidden="true">
                          <path
                            d="M12 3v2.5m0 13V21m7.5-9H21M3 12h2.5M17.3 6.7l1.8-1.8M4.9 19.1l1.8-1.8M6.7 6.7 4.9 4.9M19.1 19.1l-1.8-1.8M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                          />
                        </svg>
                      </RowIcon>
                    }
                    label="Appearance"
                    detail="Theme preference updates instantly across the app"
                    trailing={
                      <ThemeToggle
                        size="compact"
                        className="border-zinc-200 bg-zinc-50 text-zinc-700 shadow-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                      />
                    }
                  />
                  <SettingsLinkRow
                    href="/notifications"
                    icon={
                      <RowIcon>
                        <svg viewBox="0 0 24 24" fill="none" className="h-4.5 w-4.5" aria-hidden="true">
                          <path
                            d="M7 8h10M7 12h10M7 16h6"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                          />
                        </svg>
                      </RowIcon>
                    }
                    label="Notification center"
                    detail="Review recent alerts and clear what you've seen"
                    trailing={<StatusPill>{notifications.total} total</StatusPill>}
                  />
                  <SettingsValueRow
                    icon={
                      <RowIcon>
                        <svg viewBox="0 0 24 24" fill="none" className="h-4.5 w-4.5" aria-hidden="true">
                          <path
                            d="M12 5v14m7-7H5"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                          />
                        </svg>
                      </RowIcon>
                    }
                    label="Language"
                    detail="English"
                    trailing={<StatusPill>default</StatusPill>}
                  />
                </div>
              </SectionCard>

              <SectionCard
                title="Security"
                description="A compact view of the checks protecting payouts and wallet activity."
              >
                <div className="space-y-1">
                  <SettingsValueRow
                    icon={
                      <RowIcon tone="verify">
                        <svg viewBox="0 0 24 24" fill="none" className="h-4.5 w-4.5" aria-hidden="true">
                          <path
                            d="M20 7 10 17l-5-5"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </RowIcon>
                    }
                    label="Phone verification"
                    detail={formatDate(user.phoneVerifiedAt)}
                    trailing={<StatusPill tone="verify">verified</StatusPill>}
                  />
                  <SettingsValueRow
                    icon={<RowIcon tone={user.bvnLinkedAt ? "verify" : "orange"}>BVN</RowIcon>}
                    label="BVN"
                    detail={user.bvnLinkedAt ? `Linked ${formatDate(user.bvnLinkedAt)}` : "Not linked"}
                    trailing={
                      <StatusPill tone={user.bvnLinkedAt ? "verify" : "orange"}>
                        {user.bvnLinkedAt ? "linked" : "needed"}
                      </StatusPill>
                    }
                  />
                  <SettingsValueRow
                    icon={
                      <RowIcon tone={cryptoWallet?.walletVerified ? "verify" : "neutral"}>
                        <svg viewBox="0 0 24 24" fill="none" className="h-4.5 w-4.5" aria-hidden="true">
                          <path
                            d="M4 8.5h16M6 5h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm10 8h2"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </RowIcon>
                    }
                    label="Wallet"
                    detail={maskWallet(cryptoWallet?.walletAddress)}
                    trailing={
                      <StatusPill tone={cryptoWallet?.walletVerified ? "verify" : "neutral"}>
                        {cryptoWallet?.walletVerified ? "verified" : "pending"}
                      </StatusPill>
                    }
                  />
                </div>
              </SectionCard>

              <TelegramLinkingCard claim={claim} />

              <SectionCard
                title="Payments & transfers"
                description="Everything tied to payout setup, hosted links, and crypto execution."
              >
                <div className="space-y-1">
                  <SettingsValueRow
                    icon={
                      <RowIcon tone={bankAccount ? "verify" : "orange"}>
                        <svg viewBox="0 0 24 24" fill="none" className="h-4.5 w-4.5" aria-hidden="true">
                          <path
                            d="M12 4v16m-4-4h7a3 3 0 1 0 0-6H9a3 3 0 1 1 0-6h7"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </RowIcon>
                    }
                    label="Payout account"
                    detail={
                      bankAccount
                        ? `${bankAccount.bankName} ${bankAccount.accountNumberMasked}`
                        : "No bank account linked yet"
                    }
                    trailing={
                      <StatusPill tone={bankAccount ? "verify" : "orange"}>
                        {bankAccount ? "ready" : "needed"}
                      </StatusPill>
                    }
                  />
                  <SettingsLinkRow
                    href="/payments/payment-links"
                    icon={<RowIcon>+</RowIcon>}
                    label="Payment links"
                    detail="Create and share hosted payment requests"
                  />
                  <SettingsLinkRow
                    href="/send/crypto"
                    icon={
                      <RowIcon tone="verify">
                        <svg viewBox="0 0 24 24" fill="none" className="h-4.5 w-4.5" aria-hidden="true">
                          <path
                            d="M7 7h10m0 0-3-3m3 3-3 3M17 17H7m0 0 3 3m-3-3 3-3"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </RowIcon>
                    }
                    label="Send crypto"
                    detail="Resolve wallets, handles, and ENS destinations"
                  />
                </div>
              </SectionCard>
            </div>
          </div>
        </Container>
      </main>
    </div>
  );
}
