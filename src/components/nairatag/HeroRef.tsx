import type { CSSProperties } from "react";

import { HandleDemo } from "./HandleDemo";
import { ButtonLink, NairaTermBadge, cn } from "./ui";

function Naira({ className }: { className?: string }) {
  return (
    <span className={cn("font-semibold", className)} aria-hidden="true">
      {"\u20A6"}
    </span>
  );
}

function BrandMark() {
  return (
    <div className="relative h-12 w-12">
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-orange-500 via-orange-500 to-emerald-500 opacity-90 blur-[0.5px]" />
      <div className="absolute inset-0 rounded-2xl bg-white/70 shadow-sm backdrop-blur dark:bg-zinc-950/40" />
      <div className="absolute inset-0 grid place-items-center">
        <div className="rounded-xl bg-zinc-950 px-2 py-1 text-sm font-semibold tracking-tight text-white dark:bg-white dark:text-zinc-950">
          <Naira />
        </div>
      </div>
    </div>
  );
}

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
          compact && "px-2.5 py-1 text-xs",
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

      <div className="relative mx-auto w-full max-w-6xl px-5 pb-16 pt-12 sm:px-8 sm:pb-24 sm:pt-16">
        <div className="flex justify-center">
          <BrandMark />
        </div>

        <div className="relative mx-auto mt-10 max-w-5xl text-center sm:mt-14">
          <h1 className="font-display text-[54px] font-semibold leading-[0.92] tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-[96px]">
            Send money
            <br />
            to a name
          </h1>

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

          <p className="mx-auto mt-8 max-w-2xl text-base leading-7 text-zinc-700 dark:text-zinc-200 sm:mt-10 sm:text-lg">
            NairaTag lets you send, receive, and request money using simple{" "}
            <NairaTermBadge term="handles" tone="neutral" /> like{" "}
            <span className="font-semibold">{samples[0].label}</span>. No more
            typing 10-digit account numbers.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <ButtonLink href="#claim">
              Claim your <NairaTermBadge term="name" tone="inverted" />
            </ButtonLink>
            <ButtonLink href="#demo" variant="secondary">
              Check availability
            </ButtonLink>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-2 sm:hidden">
            {samples.map((s, i) => (
              <span
                key={s.label}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-semibold shadow-sm",
                  i % 2 === 0 ? "nt-float" : "nt-drift",
                  toneClasses(s.tone)
                )}
                style={
                  {
                    ["--nt-in-delay" as never]: `${i * 90}ms`,
                    ["--nt-delay" as never]: `-${i * 0.35}s`,
                    ["--nt-dur" as never]: `${7.2 + i * 0.9}s`,
                    ["--nt-amp" as never]: "4px",
                    ["--nt-dx" as never]: "4px",
                    ["--nt-dy" as never]: "4px",
                    ["--nt-rot-a" as never]: "-0.6deg",
                    ["--nt-rot-b" as never]: "0.9deg",
                  } as CSSProperties
                }
              >
                {s.label}
              </span>
            ))}
          </div>

          <div className="mt-10">
            <div className="mx-auto max-w-xl">
              <HandleDemo compact defaultValue="mama_ijebu" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
