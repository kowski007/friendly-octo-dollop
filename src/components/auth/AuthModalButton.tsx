"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { usePrivy } from "@privy-io/react-auth";

import { cn } from "@/components/nairatag/ui";

type AuthModalButtonProps = {
  children: ReactNode;
  className?: string;
  afterAuthHref?: string;
  variant?: "primary" | "secondary" | "plain";
};

const baseClass =
  "inline-flex items-center justify-center rounded-full text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nt-orange/50 disabled:cursor-not-allowed disabled:opacity-60";

const variantClass = {
  primary: "bg-nt-orange px-5 py-3 text-white shadow-sm hover:brightness-110",
  secondary:
    "border border-zinc-300/70 bg-white/70 px-5 py-3 text-zinc-950 hover:bg-white dark:border-zinc-700/80 dark:bg-zinc-950/20 dark:text-zinc-50 dark:hover:bg-zinc-950/40",
  plain:
    "px-3 py-2 text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-900/40",
};

function syncAnchor(href: string) {
  if (!href) return;

  if (href.startsWith("#")) {
    const target = document.querySelector(href);
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.history.replaceState(null, "", href);
    return;
  }

  window.location.assign(href);
}

export function AuthModalButton({
  children,
  className,
  afterAuthHref = "#demo",
  variant = "secondary",
}: AuthModalButtonProps) {
  if (!process.env.NEXT_PUBLIC_PRIVY_APP_ID) {
    return (
      <a href={afterAuthHref} className={cn(baseClass, variantClass[variant], className)}>
        {children}
      </a>
    );
  }

  return (
    <PrivyAuthButtonInner
      afterAuthHref={afterAuthHref}
      className={className}
      variant={variant}
    >
      {children}
    </PrivyAuthButtonInner>
  );
}

function PrivyAuthButtonInner({
  children,
  className,
  afterAuthHref,
  variant,
}: {
  children: ReactNode;
  className?: string;
  afterAuthHref: string;
  variant: NonNullable<AuthModalButtonProps["variant"]>;
}) {
  const { ready, authenticated, login, getAccessToken } = usePrivy();
  const [busy, setBusy] = useState(false);
  const [syncRequested, setSyncRequested] = useState(false);

  const syncSession = useCallback(async () => {
    setBusy(true);
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) throw new Error("missing_access_token");

      const response = await fetch("/api/auth/privy/session", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Cache-Control": "no-store",
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) throw new Error("privy_session_failed");
      syncAnchor(afterAuthHref);
    } finally {
      setBusy(false);
    }
  }, [afterAuthHref, getAccessToken]);

  useEffect(() => {
    if (!syncRequested || !ready || !authenticated) return;
    setSyncRequested(false);
    void syncSession();
  }, [authenticated, ready, syncRequested, syncSession]);

  async function onClick() {
    if (!ready || busy) return;

    if (!authenticated) {
      setSyncRequested(true);
      login({ loginMethods: ["sms", "email", "wallet"] });
      return;
    }

    await syncSession();
  }

  return (
    <button
      type="button"
      disabled={!ready || busy}
      onClick={onClick}
      className={cn(baseClass, variantClass[variant], className)}
    >
      {busy ? "Connecting..." : children}
    </button>
  );
}
