"use client";

import { cn } from "@/components/nairatag/ui";

const STORAGE_KEY = "nairatag-theme";

type ThemeMode = "light" | "dark";

function getPreferredTheme(): ThemeMode {
  if (typeof window === "undefined") return "light";

  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved === "light" || saved === "dark") return saved;

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: ThemeMode) {
  if (typeof document === "undefined") return;

  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.style.colorScheme = theme;
  window.localStorage.setItem(STORAGE_KEY, theme);
}

export function ThemeToggle({ className }: { className?: string }) {
  function toggleTheme() {
    const currentTheme =
      typeof document !== "undefined" && document.documentElement.classList.contains("dark")
        ? "dark"
        : getPreferredTheme();
    const nextTheme: ThemeMode = currentTheme === "dark" ? "light" : "dark";
    applyTheme(nextTheme);
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle color mode"
      title="Toggle color mode"
      className={cn(
        "inline-flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200/70 bg-white/80 text-sm font-semibold text-zinc-700 shadow-sm backdrop-blur transition hover:bg-zinc-50 dark:border-zinc-800/80 dark:bg-zinc-950/50 dark:text-zinc-200 dark:hover:bg-zinc-900/70",
        className
      )}
    >
      <span className="grid h-6 w-6 place-items-center rounded-full border border-orange-200 bg-orange-50 text-orange-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4 dark:hidden"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
          <path
            d="M12 2v2.5M12 19.5V22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M2 12h2.5M19.5 12H22M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
        <svg
          viewBox="0 0 24 24"
          className="hidden h-4 w-4 dark:block"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="sr-only">Toggle color mode</span>
    </button>
  );
}
