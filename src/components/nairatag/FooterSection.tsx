import Link from "next/link";

import { Container } from "./ui";

type FooterLink = {
  label: string;
  href: string;
};

const linkGroups: Array<{ label: string; links: FooterLink[] }> = [
  {
    label: "Product",
    links: [
      { label: "Services", href: "#services" },
      { label: "FAQ", href: "#faq" },
      { label: "Identity rails", href: "#identity-stack" },
    ],
  },
  {
    label: "Tools",
    links: [
      { label: "Pay links", href: "/paylink" },
      { label: "Marketplace", href: "/marketplace" },
      { label: "Live map", href: "/map" },
      { label: "Telegram bot", href: "https://t.me/MyNairatagbot" },
    ],
  },
  {
    label: "Company",
    links: [
      { label: "Developers", href: "#developers" },
      { label: "Contact", href: "#claim" },
    ],
  },
  {
    label: "Legal",
    links: [
      { label: "Terms", href: "/terms" },
      { label: "Privacy", href: "/privacy" },
      { label: "Name Policy", href: "/name-policy" },
    ],
  },
];

function FooterNavLink({ link }: { link: FooterLink }) {
  const className =
    "text-sm font-semibold text-zinc-600 transition hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white";

  if (link.href.startsWith("http")) {
    return (
      <a
        href={link.href}
        className={className}
        target="_blank"
        rel="noreferrer"
      >
        {link.label}
      </a>
    );
  }

  if (link.href.startsWith("#")) {
    return (
      <a href={link.href} className={className}>
        {link.label}
      </a>
    );
  }

  return (
    <Link href={link.href} className={className}>
      {link.label}
    </Link>
  );
}

export function FooterSection() {
  return (
    <footer className="border-t border-zinc-200/60 py-10 dark:border-zinc-800/60">
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
            {"\u00A9"} {new Date().getFullYear()} NairaTag. All rights reserved.
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4 sm:gap-8">
          {linkGroups.map((group) => (
            <div key={group.label}>
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400 dark:text-zinc-500">
                {group.label}
              </div>
              <div className="mt-3 flex flex-col gap-2">
                {group.links.map((link) => (
                  <FooterNavLink key={link.label} link={link} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </Container>
    </footer>
  );
}
