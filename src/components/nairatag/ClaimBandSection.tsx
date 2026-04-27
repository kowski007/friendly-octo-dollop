import { AuthModalButton } from "@/components/auth/AuthModalButton";

import { Container, NairaTermBadge } from "./ui";

export function ClaimBandSection() {
  return (
    <section className="py-6 sm:py-8">
      <Container>
        <div className="overflow-hidden rounded-[1.7rem] border border-zinc-200/70 bg-gradient-to-br from-zinc-950 via-zinc-900 to-orange-600 px-5 py-5 text-white shadow-[0_16px_40px_rgba(15,23,42,0.12)] dark:border-zinc-800 dark:from-white dark:via-zinc-100 dark:to-orange-200 dark:text-zinc-950 sm:px-6 sm:py-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <div className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Claim a <NairaTermBadge term="handle" tone="inverted" /> and start receiving
                money by name.
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <a
                href="#claim"
                className="inline-flex items-center justify-center rounded-full bg-nt-orange px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110"
              >
                Claim now
              </a>
              <AuthModalButton afterAuthHref="/dashboard" variant="secondary">
                Get started
              </AuthModalButton>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
