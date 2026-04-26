"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";

import { AppPageHeader } from "./AppPageHeader";
import { Badge, CheckIcon, Container, NairaTermBadge, cn } from "./ui";

const NAIRA = "\u20A6";

type Verification = "verified" | "business" | "pending";

type ResolveResponse =
  | {
      status: "claimed";
      handle: string;
      displayName: string;
      bank: string;
      verification: Verification;
    }
  | {
      status: "available";
      handle: string;
    }
  | {
      status: "invalid";
      reason: string;
    };

type SuggestionsResponse =
  | {
      ok: true;
      items: Array<{
        handle: string;
        displayName: string;
        verification: Verification;
      }>;
    }
  | { error: string };

type SessionState =
  | {
      ok: true;
      user: {
        id: string;
        fullName?: string;
        phone: string;
      };
      claim: {
        id: string;
        handle: string;
        verification: Verification;
        displayName?: string;
      } | null;
      bankAccount:
        | {
            bankName?: string;
            accountName?: string;
          }
        | null
        | undefined;
    }
  | null;

function normalizeHandle(input: string) {
  return input.trim().replace(/^\u20A6/u, "").replace(/^@/u, "").toLowerCase();
}

function isValidHandle(handle: string) {
  return /^[a-z0-9_]{2,20}$/.test(handle);
}

function verificationLabel(verification: Verification) {
  if (verification === "business") return "Business";
  if (verification === "pending") return "Pending";
  return "Verified";
}

function sanitizeDisplayName(displayName: string) {
  return /^pending verification$/i.test(displayName.trim()) ? "" : displayName;
}

function humanizeError(error: string) {
  switch (error) {
    case "invalid_phone":
      return "Enter a valid phone number.";
    case "invalid_code":
    case "otp_invalid":
      return "Enter the 6-digit OTP correctly.";
    case "otp_not_found":
      return "Request a fresh OTP first.";
    case "otp_expired":
      return "That OTP expired. Request another one.";
    case "otp_locked":
      return "Too many OTP attempts. Try again shortly.";
    case "already_claimed":
      return "That handle is no longer available.";
    case "user_already_has_handle":
      return "This account already has a claimed handle.";
    case "invalid_bvn":
      return "Enter a valid 11-digit BVN.";
    case "unauthorized":
      return "Verify your phone first before claiming.";
    default:
      return "Something went wrong. Please try again.";
  }
}

function SignalRow({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-white/80 px-4 py-3 text-sm font-semibold text-zinc-700 shadow-sm dark:bg-zinc-950/35 dark:text-zinc-200">
      <span>{label}</span>
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">
        <CheckIcon className="h-4 w-4" />
      </span>
    </div>
  );
}

function VerificationSeal({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center rounded-full border border-emerald-300/70 bg-[linear-gradient(180deg,#ecfdf5_0%,#bbf7d0_100%)] text-emerald-950 shadow-[0_6px_18px_rgba(16,185,129,0.18),inset_0_1px_0_rgba(255,255,255,0.9)] dark:border-emerald-700/60 dark:bg-[linear-gradient(180deg,rgba(22,163,74,0.28)_0%,rgba(5,46,22,0.92)_100%)] dark:text-emerald-100 dark:shadow-[0_8px_22px_rgba(16,185,129,0.18),inset_0_1px_0_rgba(255,255,255,0.06)]",
        className
      )}
    >
      <span className="inline-flex h-4.5 w-4.5 items-center justify-center rounded-full bg-emerald-600 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] dark:bg-emerald-500">
        <CheckIcon className="h-3 w-3" />
      </span>
    </span>
  );
}

function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={cn("h-4.5 w-4.5", className)}
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

function SuggestionButton({
  handle,
  active,
  onClick,
}: {
  handle: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex min-h-10 basis-[calc(100%-0.5rem)] max-w-[calc(100%-0.5rem)] shrink-0 snap-center items-center justify-center rounded-full border px-3 py-2 text-xs font-semibold transition sm:min-h-10 sm:basis-auto sm:max-w-none sm:justify-start sm:px-3 sm:py-2",
        active
          ? "border-emerald-500 bg-emerald-500 text-white shadow-sm"
          : "border-zinc-200/70 bg-white/75 text-zinc-700 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-900 dark:border-zinc-800/80 dark:bg-zinc-950/40 dark:text-zinc-200 dark:hover:border-emerald-900/60 dark:hover:bg-emerald-950/25 dark:hover:text-emerald-100"
      )}
    >
      <span className="max-w-full truncate sm:max-w-none">
        {NAIRA}
        {handle}
      </span>
    </button>
  );
}

function MetricCard({
  value,
  label,
  tone = "default",
}: {
  value: string;
  label: string;
  tone?: "default" | "verify" | "dark";
}) {
  return (
    <div
      className={cn(
        "rounded-[1.5rem] p-5 shadow-sm",
        tone === "verify"
          ? "bg-emerald-50 dark:bg-emerald-950/25"
          : tone === "dark"
            ? "bg-zinc-950 text-white"
            : "bg-emerald-50 dark:bg-emerald-950/20"
      )}
    >
      <div
        className={cn(
          "text-3xl font-semibold",
          tone === "dark" ? "text-white" : "text-zinc-950 dark:text-zinc-50"
        )}
      >
        {value}
      </div>
      <div
        className={cn(
          "mt-2 text-sm font-semibold",
          tone === "dark" ? "text-white/70" : "text-zinc-600 dark:text-zinc-300"
        )}
      >
        {label}
      </div>
    </div>
  );
}

function seededUnit(seed: number) {
  const value = Math.sin(seed * 9999.13) * 10000;
  return value - Math.floor(value);
}

function ClaimSuccessConfetti({
  burstKey,
}: {
  burstKey: number;
}) {
  const pieces = useMemo(() => {
    if (burstKey === 0) return [];

    return Array.from({ length: 28 }, (_, index) => ({
      id: `${burstKey}-${index}`,
      left: 8 + seededUnit(burstKey * 31 + index * 11 + 1) * 84,
      delay: seededUnit(burstKey * 31 + index * 11 + 2) * 0.32,
      duration: 1.9 + seededUnit(burstKey * 31 + index * 11 + 3) * 1.1,
      drift: -90 + seededUnit(burstKey * 31 + index * 11 + 4) * 180,
      rotate: -220 + seededUnit(burstKey * 31 + index * 11 + 5) * 440,
      size: 7 + seededUnit(burstKey * 31 + index * 11 + 6) * 7,
      color: ["#ff6a00", "#22c55e", "#111827", "#f59e0b", "#10b981"][index % 5],
      shape: index % 3 === 0 ? "999px" : "2px",
    }));
  }, [burstKey]);

  if (pieces.length === 0) return null;

  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 z-[80] h-[58vh] overflow-hidden"
      >
        {pieces.map((piece) => (
          <span
            key={piece.id}
            className="nt-claim-confetti-piece absolute top-[-8%] block"
            style={
              {
                left: `${piece.left}%`,
                width: `${piece.size}px`,
                height: `${piece.size * 1.55}px`,
                backgroundColor: piece.color,
                borderRadius: piece.shape,
                animationDelay: `${piece.delay}s`,
                animationDuration: `${piece.duration}s`,
                ["--nt-confetti-drift" as string]: `${piece.drift}px`,
                ["--nt-confetti-rotate" as string]: `${piece.rotate}deg`,
              } as CSSProperties
            }
          />
        ))}
      </div>
      <style jsx global>{`
        @keyframes nt-claim-confetti-fall {
          0% {
            opacity: 0;
            transform: translate3d(0, -10%, 0) rotate(0deg) scale(0.92);
          }
          10% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translate3d(var(--nt-confetti-drift), 78vh, 0)
              rotate(var(--nt-confetti-rotate)) scale(1);
          }
        }

        .nt-claim-confetti-piece {
          animation-name: nt-claim-confetti-fall;
          animation-timing-function: cubic-bezier(0.16, 0.84, 0.32, 1);
          animation-fill-mode: forwards;
          will-change: transform, opacity;
        }

        @media (prefers-reduced-motion: reduce) {
          .nt-claim-confetti-piece {
            animation: none !important;
            opacity: 0 !important;
          }
        }
      `}</style>
    </>
  );
}

export function ClaimPageView() {
  const [value, setValue] = useState("");
  const [remote, setRemote] = useState<ResolveResponse | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingResolve, setLoadingResolve] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);

  const [session, setSession] = useState<SessionState>(null);
  const [loadingSession, setLoadingSession] = useState(true);

  const [phone, setPhone] = useState("");
  const [requestedPhone, setRequestedPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [requestingOtp, setRequestingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [linkingBvn, setLinkingBvn] = useState(false);
  const [bvn, setBvn] = useState("");
  const [fullName, setFullName] = useState("");

  const [flowError, setFlowError] = useState<string | null>(null);
  const [flowNotice, setFlowNotice] = useState<string | null>(null);
  const [claimedNow, setClaimedNow] = useState<{
    handle: string;
    verification: Verification;
  } | null>(null);
  const [confettiBurst, setConfettiBurst] = useState(0);

  const normalized = useMemo(() => normalizeHandle(value), [value]);
  const valid = useMemo(
    () => (normalized.length === 0 ? true : isValidHandle(normalized)),
    [normalized]
  );

  const refreshSession = useCallback(async () => {
    try {
      const response = await fetch("/api/me", {
        cache: "no-store",
        headers: { "Cache-Control": "no-store" },
      });
      if (!response.ok) {
        setSession(null);
        return;
      }
      const data = (await response.json().catch(() => null)) as SessionState;
      setSession(data && "ok" in data ? data : null);
    } catch {
      setSession(null);
    } finally {
      setLoadingSession(false);
    }
  }, []);

  const resolveRemote = useCallback(async (handle: string, signal?: AbortSignal) => {
    if (!handle || !isValidHandle(handle)) return;
    setLoadingResolve(true);
    setResolveError(null);

    try {
      const response = await fetch(`/api/resolve?handle=${encodeURIComponent(handle)}`, {
        headers: { "Cache-Control": "no-store" },
        signal,
      });
      const data = (await response.json().catch(() => null)) as ResolveResponse | null;

      if (signal?.aborted) return;
      if (!response.ok || !data) throw new Error("resolve_failed");
      setRemote(data);
    } catch (error) {
      if (signal?.aborted) return;
      setResolveError(error instanceof Error ? error.message : "resolve_failed");
      setRemote(null);
    } finally {
      if (!signal?.aborted) setLoadingResolve(false);
    }
  }, []);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  useEffect(() => {
    setRemote(null);
    setResolveError(null);
    setFlowError(null);
    setFlowNotice(null);
    setClaimedNow(null);

    if (!normalized || !valid) {
      setLoadingResolve(false);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      void resolveRemote(normalized, controller.signal);
    }, 260);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [normalized, resolveRemote, valid]);

  useEffect(() => {
    let cancelled = false;

    async function loadSuggestions() {
      try {
        const response = await fetch("/api/handles/suggestions?limit=6", {
          headers: { "Cache-Control": "no-store" },
        });
        const data = (await response.json().catch(() => null)) as SuggestionsResponse | null;
        if (cancelled || !response.ok || !data || !("ok" in data)) return;

        const items = data.items
          .map((item) => normalizeHandle(item.handle))
          .filter(
            (handle, index, all) => isValidHandle(handle) && all.indexOf(handle) === index
          );
        setSuggestions(items);
      } catch {
        if (!cancelled) setSuggestions([]);
      }
    }

    void loadSuggestions();
    return () => {
      cancelled = true;
    };
  }, []);

  const isAvailable = remote?.status === "available";
  const isClaimed = remote?.status === "claimed";
  const existingClaim = session?.claim ?? null;
  const sessionReady = Boolean(session?.ok && !existingClaim);
  const alreadyHasClaim = Boolean(existingClaim);
  const canRequestOtp = isAvailable && !sessionReady && !alreadyHasClaim;
  const canClaimHandle = isAvailable && sessionReady && !alreadyHasClaim;
  const justClaimedCurrentHandle = claimedNow?.handle === existingClaim?.handle;
  const canLinkBvn =
    (claimedNow?.verification === "pending" || existingClaim?.verification === "pending") &&
    Boolean(session?.ok);
  const primaryButtonLabel = claimedNow
    ? "Claimed Successful!"
    : claiming
      ? `Claiming ${NAIRA}${normalized}`
      : loadingResolve
        ? "Searching..."
        : "Claim";

  async function requestOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRequestingOtp(true);
    setFlowError(null);
    setFlowNotice(null);

    try {
      const response = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
        body: JSON.stringify({ phone }),
      });
      const data = (await response.json().catch(() => null)) as
        | { ok?: boolean; phone?: string; devOtp?: string; error?: string }
        | null;

      if (!response.ok || !data?.ok || !data.phone) {
        throw new Error(data?.error ?? "otp_request_failed");
      }

      setRequestedPhone(data.phone);
      setDevOtp(data.devOtp ?? null);
      setFlowNotice("OTP sent. Verify it below to unlock the claim.");
    } catch (error) {
      setFlowError(humanizeError(error instanceof Error ? error.message : "otp_request_failed"));
    } finally {
      setRequestingOtp(false);
    }
  }

  async function verifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setVerifyingOtp(true);
    setFlowError(null);
    setFlowNotice(null);

    try {
      const response = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
        body: JSON.stringify({ phone: requestedPhone || phone, code: otp }),
      });
      const data = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;

      if (!response.ok || !data?.ok) {
        throw new Error(data?.error ?? "otp_verify_failed");
      }

      await refreshSession();
      setFlowNotice("Phone verified. You can claim this handle now.");
    } catch (error) {
      setFlowError(humanizeError(error instanceof Error ? error.message : "otp_verify_failed"));
    } finally {
      setVerifyingOtp(false);
    }
  }

  async function claimHandle() {
    if (!normalized) return;

    setClaiming(true);
    setFlowError(null);
    setFlowNotice(null);

    try {
      const response = await fetch("/api/handles/claim", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
        body: JSON.stringify({ handle: normalized }),
      });
      const data = (await response.json().catch(() => null)) as
        | {
            ok?: boolean;
            claim?: { handle: string; verification: Verification };
            error?: string;
          }
        | null;

      if (!response.ok || !data?.ok || !data.claim) {
        throw new Error(data?.error ?? "claim_failed");
      }

      setClaimedNow(data.claim);
      setRemote({
        status: "claimed",
        handle: data.claim.handle,
        displayName: session?.user.fullName?.trim() || "",
        bank: session?.bankAccount?.bankName || "Bank not linked yet",
        verification: data.claim.verification,
      });
      setConfettiBurst((current) => current + 1);
      await refreshSession();
      setFlowNotice("Handle claimed successfully. You can optionally add BVN verification next.");
    } catch (error) {
      setFlowError(humanizeError(error instanceof Error ? error.message : "claim_failed"));
    } finally {
      setClaiming(false);
    }
  }

  async function submitBvn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLinkingBvn(true);
    setFlowError(null);
    setFlowNotice(null);

    try {
      const response = await fetch("/api/bvn/link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
        body: JSON.stringify({ bvn, fullName }),
      });
      const data = (await response.json().catch(() => null)) as
        | {
            ok?: boolean;
            claim?: { handle: string; verification: Verification };
            error?: string;
          }
        | null;

      if (!response.ok || !data?.ok) {
        throw new Error(data?.error ?? "bvn_link_failed");
      }

      await refreshSession();
      if (data.claim) {
        setClaimedNow({
          handle: data.claim.handle,
          verification: data.claim.verification,
        });
      }
      setFlowNotice("Verification updated. Your badge is now stronger across the product.");
    } catch (error) {
      setFlowError(humanizeError(error instanceof Error ? error.message : "bvn_link_failed"));
    } finally {
      setLinkingBvn(false);
    }
  }

  async function handlePrimarySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!normalized || !valid || loadingResolve || claiming) {
      return;
    }

    if (canClaimHandle) {
      await claimHandle();
      return;
    }

    await resolveRemote(normalized);
  }

  return (
    <div className="min-h-screen bg-white text-zinc-950 transition-colors dark:bg-zinc-950 dark:text-zinc-50">
      <ClaimSuccessConfetti burstKey={confettiBurst} />
      <AppPageHeader
        ctaHref={existingClaim ? "/dashboard" : "/claim"}
        ctaLabel={existingClaim ? "Dashboard" : "Claim your name"}
      />

      <main className="py-8 sm:py-12">
        <Container>
          <div className="mx-auto max-w-[980px] space-y-10">
            <section className="mx-auto w-full max-w-[390px] overflow-hidden rounded-[1.7rem] border border-zinc-200/55 bg-white/92 p-3 shadow-[0_10px_30px_rgba(15,23,42,0.04)] dark:border-zinc-800/65 dark:bg-zinc-950/78 sm:max-w-[860px] sm:rounded-[2rem] sm:p-6">
                <div className="flex flex-col gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-sm">
                    <span className="text-lg font-semibold">{NAIRA}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-base font-semibold text-emerald-800 dark:text-emerald-200">
                      <span>Claim your {NAIRA}NairaTag</span>
                      <VerificationSeal />
                    </div>
                    <div className="mt-1 text-sm text-emerald-700 dark:text-emerald-300">
                      Type a name. Preview identity instantly.
                    </div>
                  </div>
                  <Link
                    href="/settings#telegram-linking"
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-sky-200/80 bg-sky-50 text-sky-700 shadow-sm transition hover:bg-sky-100 dark:border-sky-900/60 dark:bg-sky-950/25 dark:text-sky-200 dark:hover:bg-sky-950/40"
                    aria-label="Link Telegram"
                    title="Link Telegram"
                  >
                    <TelegramIcon />
                  </Link>
                </div>
              </div>

              <form
                onSubmit={(event) => {
                  void handlePrimarySubmit(event);
                }}
                className="mt-6"
              >
                <label className="sr-only" htmlFor="claim-handle">
                  NairaTag handle
                </label>
                <div className="rounded-[1.15rem] border border-zinc-200/55 bg-white p-1.5 shadow-[0_6px_18px_rgba(15,23,42,0.03)] focus-within:border-emerald-200 focus-within:ring-1 focus-within:ring-emerald-200/80 dark:border-zinc-800/65 dark:bg-zinc-950/45 dark:focus-within:border-emerald-900/60 dark:focus-within:ring-emerald-900/35 sm:rounded-[1.35rem] sm:p-2 sm:flex sm:items-center sm:gap-2">
                  <div className="flex min-h-12 min-w-0 flex-1 items-center gap-2 px-2">
                    <span className="select-none text-base font-semibold text-emerald-600 dark:text-emerald-300">
                      {NAIRA}
                    </span>
                    <input
                      id="claim-handle"
                      inputMode="text"
                      autoComplete="off"
                      spellCheck={false}
                      value={value}
                      onChange={(event) => setValue(event.target.value)}
                      placeholder="yourname"
                      className="min-w-0 flex-1 bg-transparent text-base font-semibold text-zinc-950 outline-none placeholder:text-zinc-400 dark:text-zinc-50 dark:placeholder:text-zinc-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!normalized || !valid || loadingSession || claiming || alreadyHasClaim}
                    className={cn(
                      "mt-2 inline-flex min-h-11 w-full items-center justify-center rounded-2xl px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-55 sm:mt-0 sm:w-auto",
                      claimedNow
                        ? "bg-emerald-600 text-white hover:bg-emerald-600"
                        : "bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                    )}
                  >
                    {primaryButtonLabel}
                  </button>
                </div>
                {resolveError ? (
                  <div className="mt-2 text-xs font-medium text-orange-800 dark:text-orange-200">
                    Could not reach the live handle registry. Please try again.
                  </div>
                ) : null}
              </form>

              {suggestions.length > 0 ? (
                <div className="-mx-1 mt-3 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
                  {suggestions.map((suggestion) => (
                    <SuggestionButton
                      key={suggestion}
                      handle={suggestion}
                      active={normalized === suggestion}
                      onClick={() => setValue(suggestion)}
                    />
                  ))}
                </div>
              ) : null}

              <div className="mt-5 space-y-4">
                {!normalized ? (
                  <div className="rounded-[1.35rem] border border-zinc-200/50 bg-white/78 p-4 text-sm text-zinc-600 dark:border-zinc-800/65 dark:bg-zinc-950/30 dark:text-zinc-300 sm:rounded-[1.6rem] sm:p-5">
                    Type a handle to preview the live NairaTag registry.
                  </div>
                ) : !valid ? (
                  <div className="rounded-[1.35rem] border border-orange-200/50 bg-orange-50/85 p-4 text-sm text-orange-950 dark:border-orange-900/50 dark:bg-orange-950/25 dark:text-orange-100 sm:rounded-[1.6rem] sm:p-5">
                    Use 2-20 characters with letters, numbers, or underscores.
                  </div>
                ) : isClaimed ? (
                  <div className="overflow-hidden rounded-[1.45rem] border border-emerald-200/50 bg-emerald-50/80 shadow-[0_8px_22px_rgba(16,185,129,0.06)] dark:border-emerald-900/50 dark:bg-emerald-950/20 sm:rounded-[1.8rem]">
                    <div className="p-4 sm:p-5">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="min-w-0 truncate text-2xl font-semibold tracking-tight text-emerald-950 dark:text-emerald-100">
                              {NAIRA}
                              {remote.handle}
                            </div>
                            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-white">
                              <CheckIcon className="h-4 w-4" />
                            </span>
                          </div>
                          {sanitizeDisplayName(remote.displayName) ? (
                            <div className="mt-2 text-base font-semibold text-emerald-950 dark:text-emerald-100">
                              {sanitizeDisplayName(remote.displayName)}
                            </div>
                          ) : null}
                          <div className="mt-1 text-sm font-medium text-emerald-900/80 dark:text-emerald-200/85">
                            {remote.bank}
                          </div>
                        </div>
                        {remote.verification !== "pending" ? (
                          <Badge tone="verify">{verificationLabel(remote.verification)}</Badge>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 border-t border-emerald-200/70 bg-white/55 p-3 dark:border-emerald-900/60 dark:bg-zinc-950/20 sm:flex-row sm:items-center sm:justify-between">
                      <div className="text-xs font-semibold text-emerald-900/70 dark:text-emerald-200/80">
                        This handle is already live on NairaTag.
                      </div>
                      <Link
                        href={`/h/${remote.handle}`}
                        className="inline-flex min-h-10 items-center justify-center rounded-full bg-zinc-950 px-4 py-2 text-xs font-semibold text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                      >
                        View public profile
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-[1.45rem] border border-emerald-200/50 bg-emerald-50/85 shadow-[0_8px_22px_rgba(16,185,129,0.05)] dark:border-emerald-900/50 dark:bg-emerald-950/25 sm:rounded-[1.8rem]">
                    <div className="p-4 sm:p-5">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="truncate text-2xl font-semibold tracking-tight text-emerald-950 dark:text-emerald-100">
                            {NAIRA}
                            {normalized}
                          </div>
                          <div className="mt-2 text-sm font-semibold text-emerald-900/85 dark:text-emerald-200">
                            {loadingResolve
                              ? "Looking up this handle..."
                              : "This handle looks available. Continue below to verify and claim it."}
                          </div>
                        </div>
                        <Badge tone="verify">
                          {loadingResolve ? "Live" : "Claimable"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                )}

                {loadingSession ? (
                  <div className="rounded-[1.25rem] border border-zinc-200/50 bg-white/78 p-4 text-sm font-medium text-zinc-600 dark:border-zinc-800/65 dark:bg-zinc-950/30 dark:text-zinc-300 sm:rounded-[1.5rem]">
                    Loading your claim session...
                  </div>
                ) : null}

                {alreadyHasClaim ? (
                  <div className="rounded-[1.25rem] border border-zinc-200/50 bg-white/82 p-4 dark:border-zinc-800/65 dark:bg-zinc-950/30 sm:rounded-[1.5rem]">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="verify">
                        {justClaimedCurrentHandle ? "Claim live" : "Active claim found"}
                      </Badge>
                      <Badge>
                        {NAIRA}
                        {existingClaim?.handle}
                      </Badge>
                    </div>
                    <div className="mt-3 text-sm leading-6 text-zinc-700 dark:text-zinc-200">
                      {justClaimedCurrentHandle
                        ? `Your ${NAIRA}${existingClaim?.handle} is now live. Open your dashboard or public profile from here.`
                        : `This account already owns ${NAIRA}${existingClaim?.handle}. Use your dashboard or public profile from here.`}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <Link
                        href="/dashboard"
                        className="inline-flex min-h-11 items-center justify-center rounded-full bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                      >
                        Open dashboard
                      </Link>
                      <Link
                        href={`/h/${existingClaim?.handle}`}
                        className="inline-flex min-h-11 items-center justify-center rounded-full border border-zinc-300/70 bg-white/70 px-4 text-sm font-semibold text-zinc-950 transition hover:bg-white dark:border-zinc-700/80 dark:bg-zinc-950/20 dark:text-zinc-50 dark:hover:bg-zinc-950/40"
                      >
                        Open profile
                      </Link>
                    </div>
                  </div>
                ) : null}

                {canRequestOtp ? (
                  <form
                    onSubmit={requestOtp}
                    className="rounded-[1.25rem] border border-zinc-200/50 bg-white/82 p-4 dark:border-zinc-800/65 dark:bg-zinc-950/30 sm:rounded-[1.5rem]"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="verify">Step 1</Badge>
                      <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                        Verify your phone
                      </div>
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
                      <input
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        value={phone}
                        onChange={(event) => setPhone(event.target.value)}
                        placeholder="08012345678"
                        className="min-h-11 rounded-2xl border border-zinc-200/55 bg-white px-4 text-sm font-medium text-zinc-950 outline-none transition focus:border-emerald-200 focus:ring-1 focus:ring-emerald-200/80 dark:border-zinc-800/65 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-emerald-900/60 dark:focus:ring-emerald-900/35"
                      />
                      <button
                        type="submit"
                        disabled={requestingOtp || !phone.trim()}
                        className="inline-flex min-h-11 items-center justify-center rounded-full bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-55 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                      >
                        {requestingOtp ? "Sending..." : "Request OTP"}
                      </button>
                    </div>
                    {devOtp ? (
                      <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-emerald-200/70 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200">
                        Sandbox OTP: {devOtp}
                      </div>
                    ) : null}
                  </form>
                ) : null}

                {isAvailable && !alreadyHasClaim && requestedPhone ? (
                  <form
                    onSubmit={verifyOtp}
                    className="rounded-[1.25rem] border border-zinc-200/50 bg-white/82 p-4 dark:border-zinc-800/65 dark:bg-zinc-950/30 sm:rounded-[1.5rem]"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="verify">Step 2</Badge>
                      <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                        Confirm OTP
                      </div>
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        value={otp}
                        onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))}
                        placeholder="123456"
                        className="min-h-11 rounded-2xl border border-zinc-200/55 bg-white px-4 text-sm font-medium tracking-[0.2em] text-zinc-950 outline-none transition focus:border-emerald-200 focus:ring-1 focus:ring-emerald-200/80 dark:border-zinc-800/65 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-emerald-900/60 dark:focus:ring-emerald-900/35"
                      />
                      <button
                        type="submit"
                        disabled={verifyingOtp || otp.length !== 6}
                        className="inline-flex min-h-11 items-center justify-center rounded-full bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-55 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                      >
                        {verifyingOtp ? "Verifying..." : "Verify OTP"}
                      </button>
                    </div>
                  </form>
                ) : null}

                {canClaimHandle ? (
                  <div className="rounded-[1.25rem] border border-zinc-200/50 bg-white/82 p-4 dark:border-zinc-800/65 dark:bg-zinc-950/30 sm:rounded-[1.5rem]">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="verify">Step 3</Badge>
                      <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                        Claim {NAIRA}
                        {normalized}
                      </div>
                    </div>
                    <div className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                      Session ready for {session?.user.phone}. Use the main Claim button above to lock in {NAIRA}
                      {normalized}.
                    </div>
                  </div>
                ) : null}

                {canLinkBvn ? (
                  <form
                    onSubmit={submitBvn}
                    className="rounded-[1.25rem] border border-zinc-200/50 bg-white/82 p-4 dark:border-zinc-800/65 dark:bg-zinc-950/30 sm:rounded-[1.5rem]"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="verify">Optional</Badge>
                      <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                        Strengthen the badge with BVN
                      </div>
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={11}
                        value={bvn}
                        onChange={(event) => setBvn(event.target.value.replace(/\D/g, ""))}
                        placeholder="BVN"
                        className="min-h-11 rounded-2xl border border-zinc-200/55 bg-white px-4 text-sm font-medium text-zinc-950 outline-none transition focus:border-emerald-200 focus:ring-1 focus:ring-emerald-200/80 dark:border-zinc-800/65 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-emerald-900/60 dark:focus:ring-emerald-900/35"
                      />
                      <input
                        type="text"
                        value={fullName}
                        onChange={(event) => setFullName(event.target.value)}
                        placeholder="Full name"
                        className="min-h-11 rounded-2xl border border-zinc-200/55 bg-white px-4 text-sm font-medium text-zinc-950 outline-none transition focus:border-emerald-200 focus:ring-1 focus:ring-emerald-200/80 dark:border-zinc-800/65 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-emerald-900/60 dark:focus:ring-emerald-900/35"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={linkingBvn || bvn.length !== 11}
                      className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-55 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                    >
                      {linkingBvn ? "Linking..." : "Link BVN"}
                    </button>
                  </form>
                ) : null}

                {flowError ? (
                  <div className="rounded-[1.1rem] border border-orange-200/50 bg-orange-50/90 px-4 py-3 text-sm font-medium text-orange-900 dark:border-orange-900/50 dark:bg-orange-950/25 dark:text-orange-100 sm:rounded-[1.25rem]">
                    {flowError}
                  </div>
                ) : null}

                {flowNotice ? (
                  <div className="rounded-[1.1rem] border border-emerald-200/50 bg-emerald-50/90 px-4 py-3 text-sm font-medium text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/25 dark:text-emerald-100 sm:rounded-[1.25rem]">
                    {flowNotice}
                  </div>
                ) : null}
              </div>
            </section>

            <section className="mx-auto max-w-[820px] space-y-6 text-center">
              <div>
                <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-5xl">
                  Type a{" "}
                  <NairaTermBadge
                    term="handle"
                    tone="verify"
                    className="relative -top-1 px-3.5 py-1.5 text-base sm:px-4 sm:py-2 sm:text-lg"
                  />
                  . Claim it on the same page.
                </h1>
                <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-zinc-700 dark:text-zinc-200">
                  This is the landing claim box turned into the real claim flow. Check the live registry,
                  verify your phone, then lock in your {NAIRA}name without leaving the screen.
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <SignalRow label="Recipient name" />
                <SignalRow label="Bank destination" />
                <SignalRow label="Verification badge" />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <MetricCard value="2 sec" label="Claim flow" tone="verify" />
                <MetricCard value="ID" label="Preview first" />
                <MetricCard value="Claim" label="Confirm on-page" tone="dark" />
              </div>
            </section>
          </div>
        </Container>
      </main>
    </div>
  );
}
