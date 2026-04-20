import Link from "next/link";

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

const links = [
  { href: "/", label: "Home" },
  { href: "/pay", label: "Pay Links" },
  { href: "/marketplace", label: "Marketplace" },
  { href: "/map", label: "Live Map" },
  { href: "/agent", label: "Agent" },
  { href: "/admin", label: "Admin" },
];

export function AppPageHeader({
  ctaHref = "/agent",
  ctaLabel = "Claim a handle",
}: {
  ctaHref?: string;
  ctaLabel?: string;
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
          className="hidden items-center gap-6 text-sm font-medium text-zinc-700 dark:text-zinc-200 md:flex"
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition hover:text-zinc-950 dark:hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <ThemeToggle className="px-3 py-2" />
          <ButtonLink href={ctaHref} className="px-4 py-2.5">
            {ctaLabel}
          </ButtonLink>
        </div>
      </Container>
    </header>
  );
}
