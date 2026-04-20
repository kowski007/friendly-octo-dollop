"use client";

import { useState } from "react";

import { cn } from "./ui";

export function CopyButton({
  value,
  className,
  label = "Copy",
  copiedLabel = "Copied",
}: {
  value: string;
  className?: string;
  label?: string;
  copiedLabel?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        "inline-flex items-center justify-center rounded-full border border-zinc-200/70 bg-white/85 px-4 py-2 text-sm font-semibold text-zinc-900 shadow-sm backdrop-blur transition hover:bg-zinc-50 dark:border-zinc-800/80 dark:bg-zinc-950/55 dark:text-zinc-50 dark:hover:bg-zinc-900/70",
        className
      )}
    >
      {copied ? copiedLabel : label}
    </button>
  );
}
