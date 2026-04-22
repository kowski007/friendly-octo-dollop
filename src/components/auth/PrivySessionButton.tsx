"use client";

import { useCallback, useEffect, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";

export type PrivySessionUser = {
  id: string;
  phone?: string;
  email?: string;
  walletAddress?: string;
};

type PrivySessionButtonProps = {
  className?: string;
  onSessionReady?: (user: PrivySessionUser) => void | Promise<void>;
};

export function PrivySessionButton(props: PrivySessionButtonProps) {
  if (!process.env.NEXT_PUBLIC_PRIVY_APP_ID) return null;
  return <PrivySessionButtonInner {...props} />;
}

function PrivySessionButtonInner({
  className,
  onSessionReady,
}: PrivySessionButtonProps) {
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
      const data = (await response.json().catch(() => null)) as
        | { ok?: boolean; user?: PrivySessionUser; error?: string }
        | null;

      if (!response.ok || !data?.ok || !data.user) {
        throw new Error(data?.error || "privy_session_failed");
      }

      await onSessionReady?.(data.user);
    } finally {
      setBusy(false);
    }
  }, [getAccessToken, onSessionReady]);

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
      className={
        className ??
        "inline-flex h-9 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-[12px] font-semibold text-emerald-950 transition hover:border-emerald-300 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-100 dark:hover:bg-emerald-950/45"
      }
    >
      {busy ? "Connecting..." : authenticated ? "Sync Privy" : "Continue with Privy"}
    </button>
  );
}
