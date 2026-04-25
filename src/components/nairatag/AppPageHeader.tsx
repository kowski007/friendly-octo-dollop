"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import Link from "next/link";

import { AuthModalButton } from "@/components/auth/AuthModalButton";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Container, ButtonLink, cn } from "./ui";

function Naira({ className }: { className?: string }) {
  return (
    <span className={cn("font-semibold", className)} aria-hidden="true">
      {"\u20A6"}
    </span>
  );
}

function LogoMark() {
  return (
    <div className="relative h-9 w-9">
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-orange-500 via-orange-500 to-emerald-500 opacity-90" />
      <div className="absolute inset-[2px] rounded-[10px] bg-white/80 shadow-sm backdrop-blur dark:bg-zinc-950/40" />
      <div className="absolute inset-0 grid place-items-center">
        <div className="rounded-lg bg-zinc-950 px-2 py-1 text-xs font-semibold tracking-tight text-white dark:bg-white dark:text-zinc-950">
          <Naira />
        </div>
      </div>
    </div>
  );
}

const toolLinks = [
  {
    href: "/dashboard",
    label: "Dashboard",
    requiresAuth: true,
    unauthenticatedLabel: "Get Started",
  },
  { href: "/payments/payment-links", label: "Payment Links" },
  { href: "/send/crypto", label: "Send crypto" },
  { href: "/marketplace", label: "Marketplace" },
  { href: "/map", label: "Live map" },
  { href: "/referrals", label: "Referrals" },
];

function ToolsMenu() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const panelId = useId();

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlurCapture={(event) => {
        if (!rootRef.current?.contains(event.relatedTarget as Node | null)) {
          setOpen(false);
        }
      }}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(true)}
        className={cn(
          "flex items-center gap-1 rounded-full px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900/70 dark:hover:text-white",
          open &&
            "bg-zinc-100 text-zinc-950 dark:bg-zinc-900/70 dark:text-white"
        )}
      >
        Tools
        <span
          className={cn(
            "text-[10px] text-zinc-400 transition",
            open && "rotate-180"
          )}
          aria-hidden="true"
        >
          v
        </span>
      </button>
      <div
        id={panelId}
        className="absolute left-0 top-full z-50 mt-2 w-48 rounded-2xl border border-zinc-200/80 bg-white/95 p-1.5 shadow-xl shadow-zinc-950/10 backdrop-blur dark:border-zinc-800/80 dark:bg-zinc-950/95 dark:shadow-black/30"
        hidden={!open}
      >
        {toolLinks.map((link) => (
          <div key={`${link.href}:${link.label}`} onClick={() => setOpen(false)}>
            {link.requiresAuth ? (
              <AuthModalButton
                afterAuthHref={link.href}
                unauthenticatedChildren={link.unauthenticatedLabel}
                variant="plain"
                className="!flex !w-full !justify-start !rounded-xl !px-3 !py-2 text-sm font-semibold"
              >
                {link.label}
              </AuthModalButton>
            ) : (
              <Link
                href={link.href}
                className="block rounded-xl px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900 dark:hover:text-white"
              >
                {link.label}
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function AppPageHeader({
  ctaHref = "/agent",
  ctaLabel = "Claim a handle",
  rightSlot,
}: {
  ctaHref?: string;
  ctaLabel?: string;
  rightSlot?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200/60 bg-white/78 backdrop-blur dark:border-zinc-800/60 dark:bg-black/45">
      <Container className="flex items-center justify-between py-4">
        <Link href="/" className="flex items-center gap-3">
          <LogoMark />
          <span className="text-sm font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            NairaTag
          </span>
        </Link>

        <nav
          aria-label="Product"
          className="hidden items-center gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-200 md:flex"
        >
          <Link
            href="/"
            className="rounded-full px-3 py-2 font-semibold transition hover:bg-zinc-100 hover:text-zinc-950 dark:hover:bg-zinc-900/70 dark:hover:text-white"
          >
            Home
          </Link>
          <ToolsMenu />
          <AuthModalButton
            afterAuthHref="/dashboard"
            unauthenticatedChildren="Get Started"
            variant="plain"
            className="rounded-full px-3 py-2 font-semibold transition hover:bg-zinc-100 hover:text-zinc-950 dark:hover:bg-zinc-900/70 dark:hover:text-white"
          >
            Dashboard
          </AuthModalButton>
          <Link
            href="/agent"
            className="rounded-full px-3 py-2 font-semibold transition hover:bg-zinc-100 hover:text-zinc-950 dark:hover:bg-zinc-900/70 dark:hover:text-white"
          >
            Agent
          </Link>
        </nav>

        <div className="flex items-center gap-2.5">
          <ThemeToggle size="dense" />
          {rightSlot ??
            (ctaHref === "/dashboard" ? (
              <AuthModalButton
                afterAuthHref="/dashboard"
                unauthenticatedChildren="Get Started"
                variant="primary"
                className="px-4 py-2.5"
              >
                {ctaLabel}
              </AuthModalButton>
            ) : (
              <ButtonLink href={ctaHref} className="px-4 py-2.5">
                {ctaLabel}
              </ButtonLink>
            ))}
        </div>
      </Container>
    </header>
  );
}
