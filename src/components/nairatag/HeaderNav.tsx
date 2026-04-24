"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

import { ButtonLink, Container, cn } from "./ui";
import { AuthModalButton } from "@/components/auth/AuthModalButton";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

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

type NavItem = {
  href: string;
  label: string;
  requiresAuth?: boolean;
  unauthenticatedLabel?: string;
};

const navGroups: Array<{ label: string; items: NavItem[] }> = [
  {
    label: "Product",
    items: [
      { href: "#how", label: "How it works" },
      { href: "#features", label: "Features" },
      { href: "#services", label: "Services" },
    ],
  },
  {
    label: "Tools",
    items: [
      {
        href: "/dashboard",
        label: "Dashboard",
        requiresAuth: true,
        unauthenticatedLabel: "Get Started",
      },
      { href: "/payments/payment-links", label: "Payment Links" },
      { href: "/payments/payment-links", label: "Pay links" },
      { href: "/marketplace", label: "Marketplace" },
      { href: "/map", label: "Live map" },
      { href: "/referrals", label: "Referrals" },
    ],
  },
  {
    label: "Resources",
    items: [
      { href: "#about", label: "About" },
      { href: "#faq", label: "FAQ" },
      { href: "#developers", label: "Developers" },
    ],
  },
];

function NavMenuItem({ item }: { item: NavItem }) {
  const className =
    "block rounded-xl px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900 dark:hover:text-white";

  if (item.requiresAuth) {
    return (
      <AuthModalButton
        afterAuthHref={item.href}
        unauthenticatedChildren={item.unauthenticatedLabel}
        variant="plain"
        className="!flex !w-full !justify-start !rounded-xl !px-3 !py-2 text-sm font-semibold"
      >
        {item.label}
      </AuthModalButton>
    );
  }

  if (item.href.startsWith("#")) {
    return (
      <a href={item.href} className={className}>
        {item.label}
      </a>
    );
  }

  return (
    <Link href={item.href} className={className}>
      {item.label}
    </Link>
  );
}

function NavGroup({
  group,
  align = "left",
}: {
  group: (typeof navGroups)[number];
  align?: "left" | "right";
}) {
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
        {group.label}
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
        className={cn(
          "absolute top-full z-50 mt-2 w-48 rounded-2xl border border-zinc-200/80 bg-white/95 p-1.5 shadow-xl shadow-zinc-950/10 backdrop-blur transition dark:border-zinc-800/80 dark:bg-zinc-950/95 dark:shadow-black/30",
          align === "right" ? "right-0" : "left-0"
        )}
        hidden={!open}
      >
        {group.items.map((item) => (
          <div key={item.href} onClick={() => setOpen(false)}>
            <NavMenuItem item={item} />
          </div>
        ))}
      </div>
    </div>
  );
}

function MobileMenu() {
  return (
    <details className="group relative md:hidden">
      <summary className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-full border border-zinc-200/70 bg-white/80 text-zinc-900 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-800/80 dark:bg-zinc-950/60 dark:text-zinc-50 dark:hover:bg-zinc-900 [&::-webkit-details-marker]:hidden">
        <span className="sr-only">Open menu</span>
        <span className="flex w-4 flex-col gap-1">
          <span className="h-0.5 rounded-full bg-current transition group-open:translate-y-1.5 group-open:rotate-45" />
          <span className="h-0.5 rounded-full bg-current transition group-open:opacity-0" />
          <span className="h-0.5 rounded-full bg-current transition group-open:-translate-y-1.5 group-open:-rotate-45" />
        </span>
      </summary>

      <div className="absolute right-0 top-full z-50 mt-3 w-[min(calc(100vw-2.5rem),22rem)] rounded-[1.5rem] border border-zinc-200/80 bg-white/96 p-3 shadow-xl shadow-zinc-950/10 backdrop-blur dark:border-zinc-800/80 dark:bg-zinc-950/96 dark:shadow-black/30">
        <div className="grid gap-3">
          {navGroups.map((group) => (
            <div key={group.label}>
              <div className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-400 dark:text-zinc-500">
                {group.label}
              </div>
              <div className="grid gap-1">
                {group.items.map((item) => (
                  <NavMenuItem key={item.href} item={item} />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 grid gap-2 border-t border-zinc-200/70 pt-3 dark:border-zinc-800/80">
          <AuthModalButton
            afterAuthHref="/dashboard"
            unauthenticatedChildren="Get Started"
            variant="secondary"
            className="w-full"
          >
            Dashboard
          </AuthModalButton>
          <ButtonLink href="#claim" className="w-full">
            Claim your name
          </ButtonLink>
        </div>
      </div>
    </details>
  );
}

export function HeaderNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200/60 bg-white/70 backdrop-blur dark:border-zinc-800/60 dark:bg-black/40">
      <Container className="flex items-center justify-between py-4">
        <a href="#top" className="flex items-center gap-3">
          <LogoMark />
          <span className="text-sm font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            NairaTag
          </span>
        </a>

        <nav
          aria-label="Primary"
          className="hidden items-center gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-200 md:flex"
        >
          {navGroups.map((group, index) => (
            <NavGroup
              key={group.label}
              group={group}
              align={index === navGroups.length - 1 ? "right" : "left"}
            />
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <AuthModalButton
            afterAuthHref="/dashboard"
            unauthenticatedChildren="Get Started"
            variant="plain"
            className="hidden md:inline-flex"
          >
            Dashboard
          </AuthModalButton>
          <ButtonLink href="#claim" className="hidden px-4 py-2.5 md:inline-flex">
            Claim your name
          </ButtonLink>
          <MobileMenu />
        </div>
      </Container>
    </header>
  );
}
