import { ButtonLink, Container, NairaTermBadge, cn } from "./ui";

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
  { href: "#how", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#services", label: "Services" },
  { href: "#about", label: "About" },
  { href: "#faq", label: "FAQ" },
  { href: "#developers", label: "Developers" },
];

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
          className="hidden items-center gap-7 text-sm font-medium text-zinc-700 dark:text-zinc-200 md:flex"
        >
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="transition hover:text-zinc-950 dark:hover:text-white"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <a
            href="#demo"
            className="hidden rounded-full px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-900/40 sm:inline-flex"
          >
            Check availability
          </a>
          <ButtonLink href="#claim" className="px-4 py-2.5">
            Claim your <NairaTermBadge term="name" tone="inverted" />
          </ButtonLink>
        </div>
      </Container>
    </header>
  );
}
