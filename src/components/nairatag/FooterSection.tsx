import { Container } from "./ui";

const links = [
  { label: "Docs", href: "#developers" },
  { label: "Privacy", href: "#faq" },
  { label: "Contact", href: "#claim" },
  { label: "Partners", href: "#services" },
  { label: "Pay links", href: "/pay" },
  { label: "Marketplace", href: "/marketplace" },
  { label: "Live map", href: "/map" },
];

export function FooterSection() {
  return (
    <footer className="border-t border-zinc-200/60 py-12 dark:border-zinc-800/60">
      <Container className="flex flex-col items-start justify-between gap-8 sm:flex-row sm:items-center">
        <div>
          <div className="text-sm font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            NairaTag
          </div>
          <div className="mt-2 max-w-md text-sm leading-7 text-zinc-600 dark:text-zinc-300">
            A payment identity layer for Nigeria. Send money to a name, see
            identity instantly, and reduce wrong transfers.
          </div>
          <div className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
            © {new Date().getFullYear()} NairaTag. All rights reserved.
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="rounded-full px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-900/40"
            >
              {l.label}
            </a>
          ))}
        </div>
      </Container>
    </footer>
  );
}
