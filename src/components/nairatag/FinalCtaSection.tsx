import { Badge, ButtonLink, Container, NairaTermBadge, cn } from "./ui";

function Naira({ className }: { className?: string }) {
  return (
    <span className={cn("font-semibold", className)} aria-hidden="true">
      {"\u20A6"}
    </span>
  );
}

export function FinalCtaSection() {
  return (
    <section id="claim" className="py-10 sm:py-16">
      <Container>
        <div className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-orange-100 via-white to-zinc-50 p-6 shadow-sm dark:from-orange-950/25 dark:via-zinc-950 dark:to-zinc-950 sm:p-8">
          <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-6">
              <Badge tone="orange">Claim your identity</Badge>
              <h2 className="mt-4 font-display text-5xl font-semibold leading-[0.95] tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-6xl">
                Own your{" "}
                <NairaTermBadge
                  term="name"
                  tone="orange"
                  className="relative -top-2 px-4 py-2 text-2xl sm:px-5 sm:py-2.5 sm:text-3xl"
                />
                .
              </h2>
              <p className="mt-5 max-w-xl text-base leading-7 text-zinc-700 dark:text-zinc-200">
                Claim a memorable handle, link a trusted destination, and give
                people a cleaner way to pay you.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <ButtonLink href="#demo">
                  Claim your <NairaTermBadge term="handle" tone="inverted" />
                </ButtonLink>
                <ButtonLink href="#developers" variant="secondary">
                  Start building
                </ButtonLink>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="rounded-[2rem] bg-white/85 p-5 shadow-sm dark:bg-zinc-950/45">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                    Ready to share
                  </div>
                  <Badge tone="verify">Verified</Badge>
                </div>
                <div className="mt-8 text-5xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                  <Naira />
                  yourname
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-orange-50 p-4 text-sm font-semibold text-orange-900 dark:bg-orange-950/25 dark:text-orange-100">
                    Pay link
                  </div>
                  <div className="rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-900 dark:bg-emerald-950/25 dark:text-emerald-100">
                    Public profile
                  </div>
                  <div className="rounded-2xl bg-zinc-950 p-4 text-sm font-semibold text-white dark:bg-white dark:text-zinc-950">
                    API-ready
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
