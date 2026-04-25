"use client";

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";

import { cn } from "./ui";

export type ToastTone = "success" | "error" | "info" | "warning";

type ToastInput = {
  title: string;
  description?: string;
  tone?: ToastTone;
  durationMs?: number;
};

type ToastRecord = ToastInput & {
  id: string;
  tone: ToastTone;
};

type ToastContextValue = {
  toast: (input: ToastInput) => string;
  dismiss: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

function toneClasses(tone: ToastTone) {
  if (tone === "success") {
    return {
      accent:
        "bg-emerald-50 text-emerald-700 shadow-[0_0_0_1px_rgba(16,185,129,0.1)] dark:bg-emerald-950/60 dark:text-emerald-200",
      glow: "from-emerald-300/45 to-cyan-200/25 dark:from-emerald-500/20 dark:to-cyan-400/10",
    };
  }
  if (tone === "error") {
    return {
      accent:
        "bg-rose-50 text-rose-700 shadow-[0_0_0_1px_rgba(244,63,94,0.08)] dark:bg-rose-950/60 dark:text-rose-200",
      glow: "from-rose-300/45 to-orange-200/25 dark:from-rose-500/20 dark:to-orange-400/10",
    };
  }
  if (tone === "warning") {
    return {
      accent:
        "bg-amber-50 text-amber-700 shadow-[0_0_0_1px_rgba(245,158,11,0.08)] dark:bg-amber-950/60 dark:text-amber-200",
      glow: "from-amber-300/45 to-yellow-200/25 dark:from-amber-500/20 dark:to-yellow-400/10",
    };
  }
  return {
    accent:
      "bg-sky-50 text-sky-700 shadow-[0_0_0_1px_rgba(14,165,233,0.08)] dark:bg-sky-950/60 dark:text-sky-200",
    glow: "from-sky-300/45 to-cyan-200/25 dark:from-sky-500/20 dark:to-cyan-400/10",
  };
}

function ToastIcon({ tone }: { tone: ToastTone }) {
  if (tone === "success") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
        <path
          d="M20 7 10 17l-5-5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (tone === "error") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
        <path
          d="m15 9-6 6m0-6 6 6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      </svg>
    );
  }
  if (tone === "warning") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
        <path
          d="M12 8v4m0 4h.01M10.2 4.7 3.6 16a2 2 0 0 0 1.7 3h13.4a2 2 0 0 0 1.7-3L13.8 4.7a2 2 0 0 0-3.6 0Z"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
      <path
        d="M12 8h.01M11 12h1v4h1"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function ToastCard({
  toast,
  onDismiss,
}: {
  toast: ToastRecord;
  onDismiss: (id: string) => void;
}) {
  const tone = toneClasses(toast.tone);

  return (
    <article className="pointer-events-auto relative overflow-hidden rounded-[1.35rem] border border-zinc-200/85 bg-white/96 p-3 shadow-[0_18px_42px_rgba(15,23,42,0.12)] ring-1 ring-black/5 backdrop-blur dark:border-zinc-800/85 dark:bg-zinc-950/94 dark:ring-white/10 dark:shadow-[0_18px_44px_rgba(0,0,0,0.34)]">
      <div
        className={cn(
          "pointer-events-none absolute inset-y-0 left-0 w-20 bg-gradient-to-r opacity-90 blur-2xl",
          tone.glow
        )}
      />
      <div className="relative flex items-start gap-3">
        <div
          className={cn(
            "mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl",
            tone.accent
          )}
        >
          <ToastIcon tone={toast.tone} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="pr-6 text-sm font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            {toast.title}
          </div>
          {toast.description ? (
            <p className="mt-1 text-xs leading-5 text-zinc-600 dark:text-zinc-300">
              {toast.description}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => onDismiss(toast.id)}
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-900 dark:hover:text-zinc-200"
          aria-label="Dismiss notification"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
            <path
              d="m15 9-6 6m0-6 6 6"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    </article>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);

  function dismiss(id: string) {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }

  function toast(input: ToastInput) {
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const record: ToastRecord = {
      ...input,
      id,
      tone: input.tone ?? "info",
    };

    setToasts((current) => [...current, record].slice(-4));

    const durationMs = input.durationMs ?? 3600;
    if (durationMs > 0) {
      window.setTimeout(() => dismiss(id), durationMs);
    }

    return id;
  }

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-[100] flex flex-col gap-3 sm:inset-x-auto sm:bottom-auto sm:right-5 sm:top-5 sm:w-[22rem]"
      >
        {toasts.map((entry) => (
          <ToastCard key={entry.id} toast={entry} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}
