import type { ReactNode } from "react";
import Link from "next/link";

import { AppPageHeader } from "./AppPageHeader";
import { FooterSection } from "./FooterSection";
import { Badge, Card, Container, SectionHeader } from "./ui";

export type LegalSection = {
  title: string;
  body: ReactNode;
};

export function LegalPage({
  eyebrow,
  title,
  description,
  updatedAt,
  sections,
}: {
  eyebrow: string;
  title: string;
  description: string;
  updatedAt: string;
  sections: LegalSection[];
}) {
  return (
    <div className="min-h-screen bg-white text-zinc-950 transition-colors dark:bg-zinc-950 dark:text-zinc-50">
      <AppPageHeader ctaHref="/claim" ctaLabel="Claim your ₦name" />
      <main className="py-10 sm:py-14">
        <Container>
          <div className="mx-auto max-w-4xl">
            <SectionHeader
              eyebrow={eyebrow}
              title={title}
              description={description}
            />

            <div className="mt-5 flex flex-wrap gap-2">
              <Badge tone="verify">Updated {updatedAt}</Badge>
              <Link
                href="/name-policy"
                className="inline-flex items-center rounded-full border border-zinc-200/70 bg-white/80 px-3 py-1 text-xs font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-800/70 dark:bg-zinc-950/30 dark:text-zinc-200 dark:hover:bg-zinc-900/50"
              >
                Name policy
              </Link>
              <Link
                href="/privacy"
                className="inline-flex items-center rounded-full border border-zinc-200/70 bg-white/80 px-3 py-1 text-xs font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-800/70 dark:bg-zinc-950/30 dark:text-zinc-200 dark:hover:bg-zinc-900/50"
              >
                Privacy
              </Link>
              <Link
                href="/terms"
                className="inline-flex items-center rounded-full border border-zinc-200/70 bg-white/80 px-3 py-1 text-xs font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-800/70 dark:bg-zinc-950/30 dark:text-zinc-200 dark:hover:bg-zinc-900/50"
              >
                Terms
              </Link>
            </div>

            <div className="mt-8 space-y-5">
              {sections.map((section) => (
                <Card key={section.title} className="p-6 sm:p-7">
                  <h2 className="text-xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                    {section.title}
                  </h2>
                  <div className="mt-3 space-y-3 text-sm leading-7 text-zinc-700 dark:text-zinc-200">
                    {section.body}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </Container>
      </main>
      <FooterSection />
    </div>
  );
}
