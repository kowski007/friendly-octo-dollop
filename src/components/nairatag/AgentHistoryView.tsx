"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Badge, cn } from "./ui";

const HISTORY_PROMPTS = [
  "\u20A6victor",
  "\u20A6mikki",
  "\u20A6fioso",
  "\u20A6mama_ijebu",
];

function HistoryChip({
  prompt,
  onClick,
}: {
  prompt: string;
  onClick: (prompt: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(prompt)}
      className="rounded-full border border-zinc-200/80 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-800/80 dark:bg-zinc-950/70 dark:text-zinc-200 dark:hover:bg-zinc-900"
    >
      {prompt}
    </button>
  );
}

export function AgentHistoryView() {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function openPrompt(prompt: string) {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem("nairatag_agent_prefill", prompt);
    }
    router.push("/claim");
  }

  function resetTest() {
    startTransition(() => {
      void (async () => {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: { "Cache-Control": "no-store" },
        });
        setStatus("Claim session reset.");
      })();
    });
  }

  return (
    <div className="min-h-screen bg-white p-3 dark:bg-zinc-950 sm:p-4">
      <div className="mx-auto max-w-[1100px] rounded-[24px] border border-zinc-200/80 bg-white p-4 shadow-[0_12px_36px_rgba(15,23,42,0.04)] dark:border-zinc-800/80 dark:bg-zinc-950 dark:shadow-[0_12px_40px_rgba(0,0,0,0.28)] sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200/75 pb-3 dark:border-zinc-800/80">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">
              Claim history
            </div>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
              Prompt shortcuts and session tools
            </h1>
          </div>

          <div className="flex flex-wrap gap-2">
            <ThemeToggle className="px-3 py-2" />
            <Link
              href="/claim"
              className="inline-flex items-center justify-center rounded-full bg-zinc-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              Back to claim
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-full border border-zinc-300/80 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-50 dark:border-zinc-800/80 dark:bg-zinc-950/70 dark:text-zinc-100 dark:hover:bg-zinc-900"
            >
              Home
            </Link>
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
          <section className="rounded-[22px] border border-zinc-200/80 bg-white p-4 shadow-[0_10px_26px_rgba(15,23,42,0.04)] dark:border-zinc-800/80 dark:bg-zinc-950/80 dark:shadow-[0_10px_28px_rgba(0,0,0,0.24)]">
            <div className="flex items-center gap-2">
              <Badge>Latest prompts</Badge>
              <span className="text-sm text-zinc-500 dark:text-zinc-400">
                Open the agent with a ready-made handle.
              </span>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {HISTORY_PROMPTS.map((prompt) => (
                <HistoryChip key={prompt} prompt={prompt} onClick={openPrompt} />
              ))}
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {HISTORY_PROMPTS.map((prompt) => (
                <button
                  key={`${prompt}_card`}
                  type="button"
                  onClick={() => openPrompt(prompt)}
                  className={cn(
                    "rounded-[18px] border border-zinc-200/80 bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-zinc-800/80 dark:bg-zinc-950/70 dark:shadow-[0_10px_24px_rgba(0,0,0,0.26)]"
                  )}
                >
                  <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-400 dark:text-zinc-500">
                    Resume prompt
                  </div>
                  <div className="mt-1 text-base font-semibold text-zinc-950 dark:text-zinc-50">
                    {prompt}
                  </div>
                  <div className="mt-1 text-[13px] leading-5 text-zinc-500 dark:text-zinc-400">
                    Open this handle in the claim composer and continue testing.
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-[22px] border border-zinc-200/80 bg-white p-4 shadow-[0_10px_26px_rgba(15,23,42,0.04)] dark:border-zinc-800/80 dark:bg-zinc-950/80 dark:shadow-[0_10px_28px_rgba(0,0,0,0.24)]">
            <div className="flex items-center gap-2">
              <Badge tone="orange">Utilities</Badge>
              <span className="text-sm text-zinc-500 dark:text-zinc-400">
                Actions moved out of the agent footer.
              </span>
            </div>

            <div className="mt-4 space-y-3">
              <Link
                href="/claim"
                className="flex items-center justify-between rounded-[18px] border border-zinc-200/80 bg-white px-3 py-3 text-left text-sm font-semibold text-zinc-900 transition hover:bg-zinc-50 dark:border-zinc-800/80 dark:bg-zinc-950/70 dark:text-zinc-100 dark:hover:bg-zinc-900"
              >
                <span>Resume claim flow</span>
                <span className="text-zinc-400 dark:text-zinc-500">/claim</span>
              </Link>

              <button
                type="button"
                onClick={resetTest}
                disabled={isPending}
                className="flex w-full items-center justify-between rounded-[18px] border border-zinc-200/80 bg-white px-3 py-3 text-left text-sm font-semibold text-zinc-900 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-800/80 dark:bg-zinc-950/70 dark:text-zinc-100 dark:hover:bg-zinc-900"
              >
                <span>{isPending ? "Resetting session..." : "Reset test session"}</span>
                <span className="text-zinc-400 dark:text-zinc-500">local</span>
              </button>

              <Link
                href="/"
                className="flex items-center justify-between rounded-[18px] border border-zinc-200/80 bg-white px-3 py-3 text-left text-sm font-semibold text-zinc-900 transition hover:bg-zinc-50 dark:border-zinc-800/80 dark:bg-zinc-950/70 dark:text-zinc-100 dark:hover:bg-zinc-900"
              >
                <span>Back home</span>
                <span className="text-zinc-400 dark:text-zinc-500">landing</span>
              </Link>
            </div>

            {status ? (
              <div className="mt-4 rounded-[16px] border border-emerald-200/80 bg-emerald-50/92 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-100">
                {status}
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
}
