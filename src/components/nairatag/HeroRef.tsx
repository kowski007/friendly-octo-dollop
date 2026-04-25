import type { CSSProperties } from "react";

import { AuthModalButton } from "@/components/auth/AuthModalButton";

import { HandleDemo } from "./HandleDemo";
import { ButtonLink, NairaTermBadge, cn } from "./ui";

function CursorIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 28 28"
      className={cn("h-6 w-6", className)}
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 3l7 19 2-7 7-2L5 3z"
        fill="currentColor"
        opacity="0.95"
      />
      <path
        d="M5 3l7 19 2-7 7-2L5 3z"
        stroke="rgba(0,0,0,0.28)"
        strokeWidth="1"
      />
    </svg>
  );
}

type Tone = "orange" | "emerald" | "violet" | "sky" | "rose";

function toneClasses(tone: Tone) {
  switch (tone) {
    case "orange":
      return "bg-orange-500 text-white";
    case "emerald":
      return "bg-emerald-600 text-white";
    case "violet":
      return "bg-violet-600 text-white";
    case "sky":
      return "bg-sky-500 text-white";
    case "rose":
      return "bg-rose-500 text-white";
    default:
      return "bg-zinc-900 text-white";
  }
}

function FloatingPill({
  label,
  tone,
  className,
  cursorClassName,
  style,
  compact = false,
}: {
  label: string;
  tone: Tone;
  className?: string;
  cursorClassName?: string;
  style?: CSSProperties;
  compact?: boolean;
}) {
  return (
    <div
      className={cn("pointer-events-none absolute", className)}
      style={style}
    >
      <CursorIcon
        className={cn(
          "absolute -left-5 -top-5 rotate-[-16deg] drop-shadow-sm",
          tone === "orange"
            ? "text-orange-500"
            : tone === "emerald"
              ? "text-emerald-600"
              : tone === "violet"
                ? "text-violet-600"
                : tone === "sky"
                  ? "text-sky-500"
                  : "text-rose-500",
          cursorClassName
        )}
      />
      <div
        className={cn(
          "inline-flex items-center rounded-md px-3 py-1 text-sm font-semibold shadow-sm",
          compact && "rounded-[10px] px-2 py-[3px] text-[11px] leading-none",
          toneClasses(tone)
        )}
      >
        {label}
      </div>
    </div>
  );
}

export function HeroRef() {
  const samples = [
    { label: "\u20A6victor", tone: "violet" as const },
    { label: "\u20A6mama_ijebu", tone: "orange" as const },
    { label: "\u20A6mikki", tone: "emerald" as const },
    { label: "\u20A6fioso", tone: "rose" as const },
    { label: "\u20A6shop", tone: "sky" as const },
  ];

  return (
    <section className="relative isolate overflow-hidden">
      <div className="absolute inset-0 bg-white dark:bg-black" />

      <div className="relative mx-auto w-full max-w-6xl px-5 pb-10 pt-10 sm:px-8 sm:pb-16 sm:pt-14">
        <div className="relative mx-auto max-w-5xl text-center">
          <div className="relative mx-auto max-w-[22rem] px-2 pb-8 pt-1 sm:max-w-none sm:px-0 sm:pb-0 sm:pt-0">
            <h1 className="relative z-10 mx-auto max-w-[21rem] font-display text-[54px] font-semibold leading-[0.92] tracking-tight text-zinc-950 dark:text-zinc-50 sm:max-w-none sm:text-[96px]">
              Send money
              <br />
              to a name
            </h1>

            <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[168px] sm:hidden">
              <FloatingPill
                label={"\u20A6victor"}
                tone="violet"
                compact
                className="nt-drift left-[2px] top-[8px]"
                cursorClassName="scale-[0.68] rotate-[-18deg]"
                style={
                  {
                    ["--nt-delay" as never]: "-0.6s",
                    ["--nt-in-delay" as never]: "30ms",
                    ["--nt-dur" as never]: "9.5s",
                    ["--nt-dx" as never]: "4px",
                    ["--nt-dy" as never]: "4px",
                  } as CSSProperties
                }
              />
              <FloatingPill
                label={"\u20A6fioso"}
                tone="rose"
                compact
                className="nt-drift right-[4px] top-[2px]"
                cursorClassName="scale-[0.68] rotate-[10deg]"
                style={
                  {
                    ["--nt-delay" as never]: "-1.2s",
                    ["--nt-in-delay" as never]: "100ms",
                    ["--nt-dur" as never]: "10.5s",
                    ["--nt-dx" as never]: "5px",
                    ["--nt-dy" as never]: "4px",
                  } as CSSProperties
                }
              />
              <FloatingPill
                label={"\u20A6mama_ijebu"}
                tone="orange"
                compact
                className="nt-float left-[-8px] top-[96px]"
                cursorClassName="scale-[0.68]"
                style={
                  {
                    ["--nt-delay" as never]: "-1.8s",
                    ["--nt-in-delay" as never]: "160ms",
                    ["--nt-dur" as never]: "7s",
                    ["--nt-amp" as never]: "4px",
                  } as CSSProperties
                }
              />
              <FloatingPill
                label={"\u20A6mikki"}
                tone="emerald"
                compact
                className="nt-drift right-[-6px] top-[108px]"
                cursorClassName="scale-[0.68] rotate-[14deg]"
                style={
                  {
                    ["--nt-delay" as never]: "-2.4s",
                    ["--nt-in-delay" as never]: "220ms",
                    ["--nt-dur" as never]: "11s",
                    ["--nt-dx" as never]: "4px",
                    ["--nt-dy" as never]: "5px",
                  } as CSSProperties
                }
              />
              <FloatingPill
                label={"\u20A6shop"}
                tone="sky"
                compact
                className="nt-float left-[36%] top-[146px]"
                cursorClassName="scale-[0.68] rotate-[-10deg]"
                style={
                  {
                    ["--nt-delay" as never]: "-0.2s",
                    ["--nt-in-delay" as never]: "280ms",
                    ["--nt-dur" as never]: "7.6s",
                    ["--nt-amp" as never]: "4px",
                  } as CSSProperties
                }
              />
            </div>
          </div>

          <div className="pointer-events-none absolute inset-0 hidden sm:block">
            <FloatingPill
              label={"\u20A6victor"}
              tone="violet"
              className="nt-drift left-[6%] top-[14%]"
              style={
                {
                  ["--nt-delay" as never]: "-0.8s",
                  ["--nt-in-delay" as never]: "40ms",
                  ["--nt-dur" as never]: "10.2s",
                  ["--nt-dx" as never]: "7px",
                  ["--nt-dy" as never]: "7px",
                  ["--nt-rot-a" as never]: "-1.2deg",
                  ["--nt-rot-b" as never]: "1.2deg",
                } as CSSProperties
              }
            />
            <FloatingPill
              label={"\u20A6mama_ijebu"}
              tone="orange"
              className="nt-float left-[-2%] top-[58%]"
              style={
                {
                  ["--nt-delay" as never]: "-1.4s",
                  ["--nt-in-delay" as never]: "120ms",
                  ["--nt-dur" as never]: "7.3s",
                  ["--nt-amp" as never]: "10px",
                } as CSSProperties
              }
            />
            <FloatingPill
              label={"\u20A6mikki"}
              tone="emerald"
              className="nt-drift left-[48%] top-[36%]"
              cursorClassName="rotate-[14deg]"
              style={
                {
                  ["--nt-delay" as never]: "-2.2s",
                  ["--nt-in-delay" as never]: "200ms",
                  ["--nt-dur" as never]: "11.6s",
                  ["--nt-dx" as never]: "5px",
                  ["--nt-dy" as never]: "8px",
                  ["--nt-rot-a" as never]: "-0.8deg",
                  ["--nt-rot-b" as never]: "1.4deg",
                } as CSSProperties
              }
            />
            <FloatingPill
              label={"\u20A6shop"}
              tone="sky"
              className="nt-float right-[2%] top-[54%]"
              cursorClassName="rotate-[-10deg]"
              style={
                {
                  ["--nt-delay" as never]: "-0.3s",
                  ["--nt-in-delay" as never]: "280ms",
                  ["--nt-dur" as never]: "6.8s",
                  ["--nt-amp" as never]: "8px",
                } as CSSProperties
              }
            />
            <FloatingPill
              label={"\u20A6fioso"}
              tone="rose"
              className="nt-drift right-[8%] top-[18%]"
              cursorClassName="rotate-[8deg]"
              style={
                {
                  ["--nt-delay" as never]: "-1.1s",
                  ["--nt-in-delay" as never]: "360ms",
                  ["--nt-dur" as never]: "12.4s",
                  ["--nt-dx" as never]: "8px",
                  ["--nt-dy" as never]: "6px",
                  ["--nt-rot-a" as never]: "-1.4deg",
                  ["--nt-rot-b" as never]: "0.9deg",
                } as CSSProperties
              }
            />
          </div>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-zinc-700 dark:text-zinc-200 sm:text-lg">
            NairaTag lets you send, receive, and request money using simple{" "}
            <NairaTermBadge term="handles" tone="neutral" /> like{" "}
            <span className="font-semibold">{samples[0].label}</span>. No more
            typing 10-digit account numbers.
          </p>

          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <ButtonLink
              href="#claim"
              className="min-h-10 whitespace-nowrap px-4 py-2 text-xs sm:text-sm"
            >
              Claim your name
            </ButtonLink>
            <AuthModalButton afterAuthHref="#demo" variant="secondary">
              Check availability
            </AuthModalButton>
          </div>

          <div className="mt-6">
            <div className="mx-auto max-w-lg">
              <HandleDemo compact />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
