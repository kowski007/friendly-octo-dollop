"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { Badge, CheckIcon, NairaTermBadge, cn } from "./ui";

const NAIRA = "\u20A6";

type Verification = "verified" | "business" | "pending";

type ResolvedProfile = {
  handle: string;
  displayName: string;
  bank: string;
  verification: Verification;
};

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

function normalizeHandle(input: string) {
  return input
    .trim()
    .replace(/^\u20A6/u, "")
    .replace(/^â‚¦/u, "")
    .replace(/^@/u, "")
    .toLowerCase();
}

function isValidHandle(handle: string) {
  return /^[a-z0-9_]{2,20}$/.test(handle);
}

function verificationLabel(verification: Verification) {
  if (verification === "business") return "Business";
  if (verification === "pending") return "Pending";
  return "Verified";
}

function StatusBadge({
  loading,
  valid,
  normalized,
  profile,
  available,
}: {
  loading: boolean;
  valid: boolean;
  normalized: string;
  profile: ResolvedProfile | null;
  available: boolean;
}) {
  if (loading) return <Badge tone="orange">Checking</Badge>;
  if (!normalized) return <Badge>Ready</Badge>;
  if (!valid) return <Badge>Invalid</Badge>;
  if (profile) return <Badge tone="verify">{verificationLabel(profile.verification)}</Badge>;
  if (available) return <Badge tone="orange">Available</Badge>;
  return <Badge>Resolve</Badge>;
}

function SuggestionButton({
  handle,
  active,
  onClick,
  compact = false,
}: {
  handle: string;
  active: boolean;
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full text-xs font-semibold transition",
        compact
          ? "min-h-8 px-2.5 py-1"
          : "min-h-10 border px-3 py-2",
        active
          ? "bg-orange-500 text-white shadow-sm"
          : compact
            ? "bg-zinc-100/80 text-zinc-600 hover:bg-orange-50 hover:text-orange-900 dark:bg-zinc-900/70 dark:text-zinc-300 dark:hover:bg-orange-950/25 dark:hover:text-orange-100"
            : "border-zinc-200/70 bg-white/75 text-zinc-700 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-900 dark:border-zinc-800/80 dark:bg-zinc-950/40 dark:text-zinc-200 dark:hover:border-orange-900/60 dark:hover:bg-orange-950/25 dark:hover:text-orange-100"
      )}
    >
      {NAIRA}
      {handle}
    </button>
  );
}

function ResultCard({
  profile,
  normalized,
  valid,
  available,
  loading,
  resolved,
  compact = false,
}: {
  profile: ResolvedProfile | null;
  normalized: string;
  valid: boolean;
  available: boolean;
  loading: boolean;
  resolved: boolean;
  compact?: boolean;
}) {
  if (!normalized) {
    if (compact) {
      return (
        <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
          Type a handle to check the live registry.
        </div>
      );
    }

    return (
      <div className="rounded-[1.6rem] border border-zinc-200/70 bg-white/65 p-4 text-sm text-zinc-600 dark:border-zinc-800/80 dark:bg-zinc-950/30 dark:text-zinc-300 sm:p-5">
        Type a handle to check the live NairaTag registry.
      </div>
    );
  }

  if (!valid) {
    if (compact) {
      return (
        <div className="text-xs font-semibold text-orange-700 dark:text-orange-200">
          Use letters, numbers, and underscores only.
        </div>
      );
    }

    return (
      <div className="rounded-[1.6rem] border border-orange-200/70 bg-orange-50 p-4 text-sm text-orange-950 dark:border-orange-900/60 dark:bg-orange-950/25 dark:text-orange-100 sm:p-5">
        Use 2-20 characters: letters, numbers, and underscores only.
      </div>
    );
  }

  if (profile) {
    if (compact) {
      return (
        <div className="rounded-2xl bg-emerald-50/80 p-3 dark:bg-emerald-950/20">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-emerald-950 dark:text-emerald-100">
                {NAIRA}
                {profile.handle}
              </div>
              <div className="mt-0.5 truncate text-sm font-medium text-zinc-700 dark:text-zinc-200">
                {profile.displayName}
              </div>
              <div className="mt-0.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                {profile.bank}
              </div>
            </div>
            <Badge tone="verify" className="shrink-0 px-2 py-0.5 text-[11px]">
              {verificationLabel(profile.verification)}
            </Badge>
          </div>
        </div>
      );
    }

    return (
      <div className="overflow-hidden rounded-[1.8rem] border border-emerald-200/70 bg-emerald-50/80 shadow-sm dark:border-emerald-900/60 dark:bg-emerald-950/20">
        <div className="p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <div className="min-w-0 truncate text-2xl font-semibold tracking-tight text-emerald-950 dark:text-emerald-100">
                  {NAIRA}
                  {profile.handle}
                </div>
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-white">
                  <CheckIcon className="h-4 w-4" />
                </span>
              </div>
              <div className="mt-2 text-base font-semibold text-emerald-950 dark:text-emerald-100">
                {profile.displayName}
              </div>
              <div className="mt-1 text-sm font-medium text-emerald-900/80 dark:text-emerald-200/85">
                {profile.bank}
              </div>
            </div>
            <Badge tone="verify">{verificationLabel(profile.verification)}</Badge>
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            {["Name matched", "Bank linked", "Safe preview"].map((label) => (
              <div
                key={label}
                className="rounded-2xl bg-white/75 px-3 py-2 text-xs font-semibold text-emerald-900 shadow-sm dark:bg-zinc-950/35 dark:text-emerald-100"
              >
                {label}
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-emerald-200/70 bg-white/55 p-3 dark:border-emerald-900/60 dark:bg-zinc-950/20 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs font-semibold text-emerald-900/70 dark:text-emerald-200/80">
            Preview first, then confirm payment.
          </div>
          <Link
            href="/agent"
            className="inline-flex min-h-10 items-center justify-center rounded-full bg-zinc-950 px-4 py-2 text-xs font-semibold text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            Claim or manage
          </Link>
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="rounded-2xl bg-orange-50/80 p-3 dark:bg-orange-950/25">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-orange-950 dark:text-orange-100">
              {NAIRA}
              {normalized}
            </div>
            <div className="mt-0.5 text-xs font-medium text-orange-800/80 dark:text-orange-200">
              {loading
                ? "Checking live registry..."
                : available
                  ? "Available to claim"
                  : resolved
                    ? "Not claimed yet"
                    : "Press Resolve to check"}
            </div>
          </div>
          {available ? (
            <Link
              href="/agent"
              className="inline-flex min-h-8 shrink-0 items-center justify-center rounded-full bg-orange-500 px-3 text-xs font-semibold text-white transition hover:bg-orange-600"
            >
              Claim
            </Link>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[1.8rem] border border-orange-200/70 bg-orange-50/85 shadow-sm dark:border-orange-900/60 dark:bg-orange-950/25">
      <div className="p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="truncate text-2xl font-semibold tracking-tight text-orange-950 dark:text-orange-100">
              {NAIRA}
              {normalized}
            </div>
            <div className="mt-2 text-sm font-semibold text-orange-900/85 dark:text-orange-200">
              {loading
                ? "Checking the live registry..."
                : available
                  ? "This handle looks available."
                  : resolved
                    ? "This handle is not claimed yet."
                    : "Press Resolve to check this handle."}
            </div>
          </div>
          <Badge tone="orange">
            {loading ? "Checking" : available ? "Claimable" : "Live check"}
          </Badge>
        </div>
      </div>
      {available ? (
        <div className="border-t border-orange-200/70 bg-white/60 p-3 dark:border-orange-900/60 dark:bg-zinc-950/20">
          <Link
            href="/agent"
            className="inline-flex min-h-10 w-full items-center justify-center rounded-full bg-orange-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-orange-600 sm:w-auto"
          >
            Claim this handle
          </Link>
        </div>
      ) : null}
    </div>
  );
}

export function HandleDemo({
  defaultValue = "",
  compact = false,
}: {
  defaultValue?: string;
  compact?: boolean;
}) {
  const [value, setValue] = useState(defaultValue);
  const [remote, setRemote] = useState<ResolveResponse | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalized = useMemo(() => normalizeHandle(value), [value]);
  const valid = useMemo(
    () => (normalized.length === 0 ? true : isValidHandle(normalized)),
    [normalized]
  );
  const resolveRemote = useCallback(
    async (handle: string, signal?: AbortSignal) => {
      if (!handle || !isValidHandle(handle)) return;
      setLoading(true);
      setError(null);

      const timeoutController = new AbortController();
      const timeout = window.setTimeout(() => timeoutController.abort(), 3200);
      const combinedSignal =
        signal && "any" in AbortSignal
          ? AbortSignal.any([signal, timeoutController.signal])
          : timeoutController.signal;

      try {
        const response = await fetch(
          `/api/resolve?handle=${encodeURIComponent(handle)}`,
          {
            headers: { "Cache-Control": "no-store" },
            signal: combinedSignal,
          }
        );
        const data = (await response.json().catch(() => null)) as
          | ResolveResponse
          | null;

        if (signal?.aborted || timeoutController.signal.aborted) return;
        if (!response.ok || !data) throw new Error("resolve_failed");
        setRemote(data);
      } catch (err) {
        if (signal?.aborted) return;
        setError(err instanceof Error ? err.message : "resolve_failed");
        setRemote(null);
      } finally {
        window.clearTimeout(timeout);
        if (!signal?.aborted) setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    setRemote(null);
    setError(null);

    if (!normalized || !valid) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      void resolveRemote(normalized, controller.signal);
    }, 350);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [normalized, resolveRemote, valid]);

  useEffect(() => {
    let cancelled = false;

    async function loadSuggestions() {
      try {
        const response = await fetch("/api/handles/suggestions?limit=5", {
          headers: { "Cache-Control": "no-store" },
        });
        const data = (await response.json().catch(() => null)) as
          | SuggestionsResponse
          | null;

        if (cancelled || !response.ok || !data || !("ok" in data)) return;
        const liveHandles = data.items
          .map((item) => normalizeHandle(item.handle))
          .filter(
            (handle, index, all) =>
              isValidHandle(handle) && all.indexOf(handle) === index
          );
        setSuggestions(liveHandles);
      } catch {
        if (!cancelled) setSuggestions([]);
      }
    }

    void loadSuggestions();

    return () => {
      cancelled = true;
    };
  }, []);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void resolveRemote(normalized);
  }

  const remoteProfile =
    remote?.status === "claimed"
      ? {
          handle: remote.handle,
          displayName: remote.displayName,
          bank: remote.bank,
          verification: remote.verification,
        }
      : null;
  const profile = remoteProfile;
  const available = remote?.status === "available";
  const resolved = remote?.status === "claimed" || remote?.status === "available";

  return (
    <div
      className={cn(
        "relative overflow-hidden backdrop-blur",
        compact
          ? "rounded-[1.5rem] bg-white/90 p-3 shadow-[0_18px_60px_rgba(24,24,27,0.10)] ring-1 ring-zinc-200/70 dark:bg-zinc-950/75 dark:ring-zinc-800/70 sm:p-4"
          : "rounded-[2rem] border border-orange-200/70 bg-gradient-to-br from-orange-50 via-white to-zinc-50 p-4 shadow-sm dark:border-orange-900/60 dark:from-orange-950/25 dark:via-zinc-950 dark:to-zinc-950/80 sm:p-6"
      )}
    >
      {!compact ? (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-sm">
              <span className="text-lg font-semibold">{NAIRA}</span>
            </div>
            <div className="min-w-0">
              <div className="text-base font-semibold text-zinc-950 dark:text-zinc-50">
                Resolve a{" "}
                <NairaTermBadge term="handle" tone="orange" className="-my-0.5" />
              </div>
              <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                Type a name. See identity instantly.
              </div>
            </div>
          </div>
          <StatusBadge
            loading={loading}
            valid={valid}
            normalized={normalized}
            profile={profile}
            available={available}
          />
        </div>
      ) : null}

      <form onSubmit={onSubmit} className={compact ? "" : "mt-6"}>
        <label className="sr-only" htmlFor={compact ? "hero-handle" : "demo-handle"}>
          NairaTag handle
        </label>
        <div
          className={cn(
            "bg-white shadow-sm focus-within:ring-2 focus-within:ring-orange-200 dark:bg-zinc-950/45 dark:focus-within:ring-orange-900/45",
            compact
              ? "flex items-center gap-2 rounded-2xl p-1.5 ring-1 ring-zinc-200/70 dark:ring-zinc-800/70"
              : "rounded-[1.35rem] border border-zinc-200 p-2 focus-within:border-orange-300 dark:border-zinc-800 dark:focus-within:border-orange-800 sm:flex sm:items-center sm:gap-2"
          )}
        >
          <div
            className={cn(
              "flex min-w-0 flex-1 items-center gap-2 px-2",
              compact ? "min-h-10" : "min-h-12"
            )}
          >
            <span className="select-none text-base font-semibold text-orange-600 dark:text-orange-300">
              {NAIRA}
            </span>
            <input
              id={compact ? "hero-handle" : "demo-handle"}
              inputMode="text"
              autoComplete="off"
              spellCheck={false}
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder="yourname"
              className={cn(
                "min-w-0 flex-1 bg-transparent font-semibold text-zinc-950 outline-none placeholder:text-zinc-400 dark:text-zinc-50 dark:placeholder:text-zinc-500",
                compact ? "text-sm" : "text-base"
              )}
            />
          </div>
          <button
            type="submit"
            disabled={!normalized || !valid || loading}
            className={cn(
              "inline-flex items-center justify-center bg-zinc-950 font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-55 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200",
              compact
                ? "min-h-10 shrink-0 rounded-xl px-3 text-xs"
                : "mt-2 min-h-11 w-full rounded-2xl px-4 text-sm sm:mt-0 sm:w-auto"
            )}
          >
            {loading ? "Checking..." : "Resolve"}
          </button>
        </div>
        {error ? (
          <div className="mt-2 text-xs font-medium text-orange-800 dark:text-orange-200">
            Could not reach the live resolver. Please try again.
          </div>
        ) : null}
      </form>

      {suggestions.length > 0 ? (
        <div
          className={cn(
            "flex gap-2",
            compact
              ? "mt-2 flex-wrap"
              : "mt-3 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible"
          )}
        >
          {suggestions.map((suggestion) => (
            <SuggestionButton
              key={suggestion}
              handle={suggestion}
              active={normalized === suggestion}
              onClick={() => setValue(suggestion)}
              compact={compact}
            />
          ))}
        </div>
      ) : null}

      <div className={compact ? "mt-3" : "mt-5"}>
        <ResultCard
          profile={profile}
          normalized={normalized}
          valid={valid}
          available={available}
          loading={loading}
          resolved={resolved}
          compact={compact}
        />
      </div>
    </div>
  );
}
