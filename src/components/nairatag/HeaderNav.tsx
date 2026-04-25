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

function BrandLockup({ mobile = false }: { mobile?: boolean }) {
  return (
    <a href="#top" className="flex min-w-0 items-center gap-3">
      <LogoMark />
      <div className="min-w-0">
        <div
          className={cn(
            "truncate font-semibold tracking-tight text-zinc-950 dark:text-zinc-50",
            mobile ? "text-[15px]" : "text-sm"
          )}
        >
          NairaTag
        </div>
        {mobile ? (
          <div className="truncate text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
            Handles, pay links, and crypto
          </div>
        ) : null}
      </div>
    </a>
  );
}

function LiveClaimsButton({ mobile = false }: { mobile?: boolean }) {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let active = true;

    async function loadClaimsCount() {
      try {
        const response = await fetch("/api/stats/claims", {
          cache: "no-store",
        });

        if (!response.ok) return;

        const payload = (await response.json()) as { totalClaims?: unknown };
        if (!active || typeof payload.totalClaims !== "number") return;

        setCount(payload.totalClaims);
      } catch {
        // Keep the button hidden if the live count is unavailable.
      }
    }

    void loadClaimsCount();
    const interval = window.setInterval(() => {
      void loadClaimsCount();
    }, 45000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  if (count === null) return null;

  return (
    <Link
      href="/map"
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-zinc-200/80 bg-white/90 text-xs font-semibold text-zinc-800 shadow-sm backdrop-blur transition hover:border-orange-200 hover:text-zinc-950 dark:border-zinc-800/80 dark:bg-zinc-950/75 dark:text-zinc-100 dark:hover:border-zinc-700 dark:hover:text-white",
        mobile
          ? "mt-2.5 w-full justify-center px-3 py-2"
          : "px-3.5 py-2.5"
      )}
      aria-label={`${count.toLocaleString()} claimed NairaTag handles`}
      title="Live claimed handle count"
    >
      <span className="relative flex h-2.5 w-2.5">
        <span className="absolute inset-0 rounded-full bg-emerald-500/30" />
        <span className="absolute inset-[2px] rounded-full bg-emerald-500" />
      </span>
      <span>{count.toLocaleString()} Claimed</span>
    </Link>
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
          <div key={`${item.href}:${item.label}`} onClick={() => setOpen(false)}>
            <NavMenuItem item={item} />
          </div>
        ))}
      </div>
    </div>
  );
}

function MobileMenuArrow() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
      <path
        d="m9 6 6 6-6 6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MobileMenuItem({
  item,
  onSelect,
}: {
  item: NavItem;
  onSelect: () => void;
}) {
  const rowClass =
    "flex min-h-[2.6rem] items-center justify-between gap-3 rounded-[1rem] px-3 py-2.5 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900 dark:hover:text-white";

  if (item.requiresAuth) {
    return (
      <AuthModalButton
        afterAuthHref={item.href}
        unauthenticatedChildren={
          <span className="flex w-full items-center justify-between gap-3">
            <span>{item.unauthenticatedLabel ?? item.label}</span>
            <span className="text-zinc-400">
              <MobileMenuArrow />
            </span>
          </span>
        }
        variant="plain"
        className={cn("!flex !w-full !justify-between !rounded-[1rem] !px-3 !py-2.5", rowClass)}
      >
        <span className="flex w-full items-center justify-between gap-3">
          <span>{item.label}</span>
          <span className="text-zinc-400">
            <MobileMenuArrow />
          </span>
        </span>
      </AuthModalButton>
    );
  }

  if (item.href.startsWith("#")) {
    return (
      <a href={item.href} className={rowClass} onClick={onSelect}>
        <span>{item.label}</span>
        <span className="text-zinc-400">
          <MobileMenuArrow />
        </span>
      </a>
    );
  }

  return (
    <Link href={item.href} className={rowClass} onClick={onSelect}>
      <span>{item.label}</span>
      <span className="text-zinc-400">
        <MobileMenuArrow />
      </span>
    </Link>
  );
}

function MobileMenu() {
  const detailsRef = useRef<HTMLDetailsElement | null>(null);

  function closeMenu() {
    if (detailsRef.current) detailsRef.current.open = false;
  }

  return (
    <details ref={detailsRef} className="group relative md:hidden">
      <summary className="flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-full bg-nt-orange text-white shadow-[0_8px_18px_rgba(249,115,22,0.24)] transition hover:brightness-110 dark:bg-white dark:text-zinc-950 dark:shadow-[0_8px_18px_rgba(255,255,255,0.14)] [&::-webkit-details-marker]:hidden">
        <span className="sr-only">Open menu</span>
        <span className="flex w-3.5 flex-col gap-[3px]">
          <span className="h-px rounded-full bg-current transition group-open:translate-y-1 group-open:rotate-45" />
          <span className="h-px rounded-full bg-current transition group-open:opacity-0" />
          <span className="h-px rounded-full bg-current transition group-open:-translate-y-1 group-open:-rotate-45" />
        </span>
      </summary>

      <button
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        onClick={closeMenu}
        className="pointer-events-none fixed inset-0 z-40 bg-zinc-950/18 opacity-0 transition duration-150 group-open:pointer-events-auto group-open:opacity-100 dark:bg-black/48"
      />

      <div className="absolute right-0 top-full z-50 mt-2 w-[min(calc(100vw-3rem),17.5rem)] overflow-hidden rounded-[1.5rem] border border-zinc-200 bg-white shadow-[0_18px_42px_rgba(15,23,42,0.14)] ring-1 ring-black/5 dark:border-zinc-800 dark:bg-zinc-950 dark:ring-white/10 dark:shadow-[0_18px_46px_rgba(0,0,0,0.34)]">
        <div className="flex items-center justify-between border-b border-zinc-200 px-3.5 py-3 dark:border-zinc-800">
          <div className="text-base font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            Menu
          </div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400 dark:text-zinc-500">
            Quick links
          </div>
        </div>

        <div className="max-h-[68vh] overflow-y-auto px-2.5 py-2.5">
          {navGroups.map((group) => (
            <div key={group.label} className="pb-2 last:pb-0">
              <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-400 dark:text-zinc-500">
                {group.label}
              </div>
              <div className="grid gap-0.5">
                {group.items.map((item) => (
                  <MobileMenuItem
                    key={`${item.href}:${item.label}`}
                    item={item}
                    onSelect={closeMenu}
                  />
                ))}
              </div>
            </div>
          ))}

          <div className="border-t border-zinc-200 pt-2.5 dark:border-zinc-800">
            <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-400 dark:text-zinc-500">
              Account
            </div>
            <div className="grid gap-0.5">
              <AuthModalButton
                afterAuthHref="/dashboard"
                unauthenticatedChildren={
                  <span className="flex w-full items-center justify-between gap-3">
                    <span>Get Started</span>
                    <span className="text-zinc-400">
                      <MobileMenuArrow />
                    </span>
                  </span>
                }
                variant="plain"
                className="!flex !w-full !justify-between !rounded-[1rem] !px-3 !py-2.5 text-sm font-semibold"
              >
                <span className="flex w-full items-center justify-between gap-3">
                  <span>Dashboard</span>
                  <span className="text-zinc-400">
                    <MobileMenuArrow />
                  </span>
                </span>
              </AuthModalButton>
              <a
                href="#claim"
                onClick={closeMenu}
                className="flex min-h-[2.6rem] items-center justify-between gap-3 rounded-[1rem] px-3 py-2.5 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900 dark:hover:text-white"
              >
                <span>Claim your name</span>
                <span className="text-zinc-400">
                  <MobileMenuArrow />
                </span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </details>
  );
}

export function HeaderNav() {
  return (
    <header className="sticky top-0 z-50 bg-white/70 backdrop-blur dark:bg-black/40 md:border-b md:border-zinc-200/60 md:dark:border-zinc-800/60">
      <Container className="py-3 md:py-4">
        <div className="rounded-[1.6rem] border border-zinc-200 bg-white px-3 py-2.5 shadow-[0_16px_40px_rgba(15,23,42,0.08)] dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-[0_18px_44px_rgba(0,0,0,0.3)] md:hidden">
          <div className="flex items-center justify-between">
            <BrandLockup mobile />
            <div className="ml-3 flex shrink-0 items-center gap-1.5">
              <ThemeToggle
                size="compact"
                className="border-zinc-200 bg-zinc-50 text-zinc-700 shadow-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
              <MobileMenu />
            </div>
          </div>
          <LiveClaimsButton mobile />
        </div>

        <div className="hidden items-center justify-between md:flex">
          <BrandLockup />

          <nav
            aria-label="Primary"
            className="flex items-center gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-200"
          >
            {navGroups.map((group, index) => (
              <NavGroup
                key={group.label}
                group={group}
                align={index === navGroups.length - 1 ? "right" : "left"}
              />
            ))}
          </nav>

          <div className="flex items-center gap-2.5">
            <LiveClaimsButton />
            <ThemeToggle size="dense" />
            <AuthModalButton
              afterAuthHref="/dashboard"
              unauthenticatedChildren="Get Started"
              variant="plain"
            >
              Dashboard
            </AuthModalButton>
            <ButtonLink href="#claim" className="px-4 py-2.5">
              Claim your name
            </ButtonLink>
          </div>
        </div>
      </Container>
    </header>
  );
}
