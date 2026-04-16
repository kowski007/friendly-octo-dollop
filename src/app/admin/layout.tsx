import type { ReactNode } from "react";

import Link from "next/link";

import { Badge, Container, cn } from "@/components/nairatag/ui";

function NavLink({
  href,
  children,
  active = false,
}: {
  href: string;
  children: ReactNode;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-full px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-900/40",
        active &&
          "bg-zinc-950 text-white hover:bg-zinc-950 dark:bg-white dark:text-zinc-950"
      )}
    >
      {children}
    </Link>
  );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  // Note: simple local admin UI; add auth before deploying anywhere public.
  return (
    <div className="nt-landing-bg min-h-screen">
      <header className="sticky top-0 z-50 border-b border-zinc-200/60 bg-white/70 backdrop-blur dark:border-zinc-800/60 dark:bg-black/40">
        <Container className="flex items-center justify-between gap-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="text-sm font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
              NairaTag
            </div>
            <Badge tone="neutral" className="hidden sm:inline-flex">
              Admin
            </Badge>
          </Link>

          <nav
            aria-label="Admin"
            className="flex items-center gap-2"
          >
            <NavLink href="/admin">Dashboard</NavLink>
            <NavLink href="/admin/users">Users</NavLink>
            <NavLink href="/admin/claims">Claims</NavLink>
            <NavLink href="/admin/api">API usage</NavLink>
          </nav>
        </Container>
      </header>

      <main className="py-10 sm:py-12">{children}</main>
    </div>
  );
}
