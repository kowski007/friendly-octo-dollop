import type { ReactNode } from "react";

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function NairaTermBadge({
  term,
  tone = "orange",
  size = "sm",
  className,
}: {
  term: "name" | "handle" | "handles";
  tone?: "neutral" | "verify" | "orange" | "inverted";
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizeClasses =
    size === "lg"
      ? "px-3.5 py-1.5 text-sm sm:text-base"
      : size === "md"
        ? "px-3 py-1 text-xs sm:text-sm"
        : "";

  return (
    <Badge
      tone={tone}
      className={cn("align-middle whitespace-nowrap", sizeClasses, className)}
    >
      <span className="font-semibold" aria-hidden="true">
        {"\u20A6"}
      </span>
      {term}
    </Badge>
  );
}

export function Container({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-6xl px-5 sm:px-8", className)}>
      {children}
    </div>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  align = "left",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
}) {
  return (
    <div className={cn(align === "center" && "text-center")}>
      {eyebrow ? (
        <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200/70 bg-white/70 px-3 py-1 text-xs font-medium text-zinc-700 shadow-sm backdrop-blur dark:border-zinc-800/80 dark:bg-zinc-950/40 dark:text-zinc-200">
          <span className="h-1.5 w-1.5 rounded-full bg-nt-orange" />
          {eyebrow}
        </div>
      ) : null}
      <h2 className="mt-4 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-4xl">
        {title}
      </h2>
      {description ? (
        <p
          className={cn(
            "mt-3 text-base leading-7 text-zinc-600 dark:text-zinc-300",
            align === "center" ? "mx-auto max-w-2xl" : "max-w-2xl"
          )}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-3xl border border-zinc-200/60 bg-white/60 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-soft dark:border-zinc-800/70 dark:bg-zinc-950/30",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/70 to-transparent opacity-70 dark:from-white/10" />
      <div className="relative">{children}</div>
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "verify" | "orange" | "inverted";
  className?: string;
}) {
  const toneClasses =
    tone === "verify"
      ? "border-emerald-200/70 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200"
      : tone === "orange"
        ? "border-orange-200/70 bg-orange-50 text-orange-900 dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-100"
        : tone === "inverted"
          ? "border-white/35 bg-white/15 text-white"
        : "border-zinc-200/70 bg-white/70 text-zinc-700 dark:border-zinc-800/80 dark:bg-zinc-950/30 dark:text-zinc-200";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        toneClasses,
        className
      )}
    >
      {children}
    </span>
  );
}

export function ButtonLink({
  href,
  children,
  variant = "primary",
  className,
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary";
  className?: string;
}) {
  const base =
    "inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nt-orange/50";
  const styles =
    variant === "primary"
      ? "bg-nt-orange text-white shadow-sm hover:brightness-110"
      : "border border-zinc-300/70 bg-white/70 text-zinc-950 hover:bg-white dark:border-zinc-700/80 dark:bg-zinc-950/20 dark:text-zinc-50 dark:hover:bg-zinc-950/40";

  return (
    <a href={href} className={cn(base, styles, className)}>
      {children}
    </a>
  );
}

export function CodeBlock({
  code,
  className,
}: {
  code: string;
  className?: string;
}) {
  return (
    <pre
      className={cn(
        "overflow-x-auto rounded-2xl border border-zinc-200/70 bg-zinc-950 px-4 py-4 text-sm text-zinc-100 shadow-sm dark:border-zinc-800/80",
        className
      )}
    >
      <code className="font-mono">{code}</code>
    </pre>
  );
}

export function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={cn("h-4 w-4", className)}
      aria-hidden="true"
    >
      <path
        d="M20 6L9 17l-5-5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SparkIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={cn("h-5 w-5", className)}
      aria-hidden="true"
    >
      <path
        d="M12 2l1.6 6.1L20 10l-6.4 1.9L12 18l-1.6-6.1L4 10l6.4-1.9L12 2z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}
