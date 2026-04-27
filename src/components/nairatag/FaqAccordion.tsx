"use client";

import type { ReactNode } from "react";
import { useId, useState } from "react";
import { cn } from "./ui";

type Tone = "blue" | "gray" | "orange" | "black";

export type FaqItem = {
  title: ReactNode;
  body: ReactNode;
  tone: Tone;
};

function toneClasses(tone: Tone) {
  switch (tone) {
    case "blue":
      return "bg-emerald-100/90 text-zinc-950 dark:bg-emerald-950/25 dark:text-zinc-50";
    case "orange":
      return "bg-orange-200/80 text-zinc-950 dark:bg-orange-950/30 dark:text-zinc-50";
    case "black":
      return "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950";
    case "gray":
    default:
      return "bg-zinc-200/80 text-zinc-950 dark:bg-zinc-900/50 dark:text-zinc-50";
  }
}

function PlusMinus({ open }: { open: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/70 text-zinc-950 shadow-sm backdrop-blur transition dark:bg-black/20 dark:text-white",
        open && "rotate-180"
      )}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
        <path
          d="M5 12h14"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        {!open ? (
          <path
            d="M12 5v14"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        ) : null}
      </svg>
    </span>
  );
}

export function FaqAccordion({
  items,
  defaultOpenIndex = 1,
}: {
  items: FaqItem[];
  defaultOpenIndex?: number;
}) {
  const [openIndex, setOpenIndex] = useState(defaultOpenIndex);
  const baseId = useId();

  return (
    <div className="space-y-2.5">
      {items.map((item, i) => {
        const isOpen = openIndex === i;
        const contentId = `${baseId}-faq-${i}`;
        return (
          <div
            key={i}
            className={cn(
              "rounded-2xl border border-black/10 px-4 py-3.5 shadow-sm transition sm:px-5 sm:py-4 dark:border-white/10",
              toneClasses(item.tone)
            )}
          >
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 text-left"
              aria-expanded={isOpen}
              aria-controls={contentId}
              onClick={() => setOpenIndex(isOpen ? -1 : i)}
            >
              <span className="pr-2 text-[15px] font-semibold leading-6 tracking-tight sm:text-base">
                {item.title}
              </span>
              <PlusMinus open={isOpen} />
            </button>

            <div
              id={contentId}
              className={cn(
                "grid transition-[grid-template-rows] duration-300 ease-out",
                isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              )}
            >
              <div className="overflow-hidden">
                <p
                  className={cn(
                    "mt-2.5 max-w-xl text-sm leading-6",
                    item.tone === "black"
                      ? "text-white/85 dark:text-zinc-950/80"
                      : "text-zinc-700 dark:text-zinc-200"
                  )}
                >
                  {item.body}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
