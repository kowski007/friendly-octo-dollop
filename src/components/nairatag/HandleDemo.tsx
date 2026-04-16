"use client";

import { useMemo, useState } from "react";
import { NairaTermBadge } from "./ui";

type Verification = "verified" | "business";

type DemoProfile = {
  handle: string;
  displayName: string;
  bank: string;
  verification: Verification;
};

const SAMPLE: Record<string, DemoProfile> = {
  victor: {
    handle: "victor",
    displayName: "Victor Adeyemi",
    bank: "GTBank",
    verification: "verified",
  },
  mama_ijebu: {
    handle: "mama_ijebu",
    displayName: "Iya Basira (Mama Ijebu)",
    bank: "UBA",
    verification: "verified",
  },
  mikki: {
    handle: "mikki",
    displayName: "Mikki Danjuma",
    bank: "Kuda",
    verification: "verified",
  },
  fioso: {
    handle: "fioso",
    displayName: "Fioso",
    bank: "PalmPay",
    verification: "verified",
  },
  shop: {
    handle: "shop",
    displayName: "Shop by Kemi",
    bank: "Access Bank",
    verification: "business",
  },
};

function normalizeHandle(input: string) {
  return input
    .trim()
    .replace(/^₦/u, "")
    .replace(/^@/u, "")
    .toLowerCase();
}

function isValidHandle(handle: string) {
  return /^[a-z0-9_]{2,20}$/.test(handle);
}

export function HandleDemo({
  defaultValue = "victor",
  compact = false,
}: {
  defaultValue?: string;
  compact?: boolean;
}) {
  const [value, setValue] = useState(defaultValue);

  const normalized = useMemo(() => normalizeHandle(value), [value]);
  const valid = useMemo(
    () => (normalized.length === 0 ? true : isValidHandle(normalized)),
    [normalized]
  );

  const profile = useMemo(() => SAMPLE[normalized], [normalized]);
  const availability = useMemo(() => {
    if (!normalized) return null;
    if (!valid) return null;
    if (profile) return "taken";
    return "available";
  }, [normalized, valid, profile]);

  const suggestions = useMemo(
    () => ["victor", "mama_ijebu", "mikki", "fioso", "shop"],
    []
  );

  return (
    <div
      className={[
        "rounded-2xl border border-zinc-200/70 bg-white/80 shadow-sm backdrop-blur dark:border-zinc-800/80 dark:bg-zinc-950/40",
        compact ? "p-4" : "p-5",
      ].join(" ")}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-900 dark:bg-orange-950/30 dark:text-orange-100">
          <span className="text-base font-semibold">₦</span>
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
            Resolve a{" "}
            <NairaTermBadge term="handle" tone="orange" className="-my-0.5" />
          </div>
          <div className="text-xs text-zinc-600 dark:text-zinc-300">
            Type a name. See identity instantly.
          </div>
        </div>
      </div>

      <div className={compact ? "mt-4" : "mt-5"}>
        <label className="sr-only" htmlFor="handle">
          NairaTag handle
        </label>
        <div className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-orange-200 dark:border-zinc-800 dark:bg-zinc-950/30 dark:focus-within:ring-orange-900/50">
          <span className="select-none text-sm font-semibold text-zinc-500 dark:text-zinc-400">
            ₦
          </span>
          <input
            id="handle"
            inputMode="text"
            autoComplete="off"
            spellCheck={false}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="yourname"
            className="w-full bg-transparent text-sm font-medium text-zinc-950 outline-none placeholder:text-zinc-400 dark:text-zinc-50 dark:placeholder:text-zinc-500"
          />
          <span
            className={[
              "rounded-full px-2.5 py-1 text-xs font-semibold",
              availability === "taken"
                ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200"
                : availability === "available"
                  ? "bg-orange-50 text-orange-900 dark:bg-orange-950/30 dark:text-orange-100"
                  : "bg-zinc-100 text-zinc-600 dark:bg-zinc-900/50 dark:text-zinc-300",
            ].join(" ")}
          >
            {availability === "taken"
              ? "Verified"
              : availability === "available"
                ? "Available"
                : "Type a name"}
          </span>
        </div>

        {!valid ? (
          <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-300">
            Use 2–20 characters: letters, numbers, underscores.
          </p>
        ) : null}

        <div className="mt-3 flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setValue(s)}
              className="rounded-full border border-zinc-200/70 bg-white/70 px-3 py-1 text-xs font-semibold text-zinc-700 transition hover:bg-white dark:border-zinc-800/80 dark:bg-zinc-950/30 dark:text-zinc-200 dark:hover:bg-zinc-950/50"
            >
              ₦{s}
            </button>
          ))}
        </div>
      </div>

      <div className={compact ? "mt-4" : "mt-5"}>
        {profile ? (
          <div className="rounded-2xl border border-emerald-200/60 bg-emerald-50/70 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-emerald-950 dark:text-emerald-100">
                  ₦{profile.handle}{" "}
                  <span className="text-emerald-700 dark:text-emerald-300">
                    ✓
                  </span>
                </div>
                <div className="mt-1 text-sm text-emerald-900/90 dark:text-emerald-200">
                  {profile.displayName}
                </div>
                <div className="mt-1 text-xs font-medium text-emerald-800/90 dark:text-emerald-200/90">
                  {profile.bank}
                </div>
              </div>
              <span className="rounded-full bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white">
                {profile.verification === "business" ? "Business" : "Verified"}
              </span>
            </div>
          </div>
        ) : normalized && valid ? (
          <div className="rounded-2xl border border-orange-200/60 bg-orange-50/70 p-4 dark:border-orange-900/50 dark:bg-orange-950/20">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-orange-950 dark:text-orange-100">
                  ₦{normalized}
                </div>
                <div className="mt-1 text-sm text-orange-900/90 dark:text-orange-200">
                  This handle looks available.
                </div>
                <div className="mt-1 text-xs font-medium text-orange-800/90 dark:text-orange-200/90">
                  Claim it and link your bank in under 2 minutes.
                </div>
              </div>
              <span className="rounded-full bg-nt-orange px-2.5 py-1 text-xs font-semibold text-white">
                Claim
              </span>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-zinc-200/70 bg-white/60 p-4 text-sm text-zinc-700 dark:border-zinc-800/80 dark:bg-zinc-950/20 dark:text-zinc-300">
            Try: <span className="font-semibold">₦mama_ijebu</span> or{" "}
            <span className="font-semibold">₦victor</span>
          </div>
        )}
      </div>
    </div>
  );
}
