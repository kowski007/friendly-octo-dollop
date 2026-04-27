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
    <section id="claim" className="py-8 sm:py-16">
      <Container>
        <div className="overflow-hidden rounded-[1.7rem] bg-gradient-to-br from-orange-100 via-white to-zinc-50 p-5 shadow-sm dark:from-orange-950/25 dark:via-zinc-950 dark:to-zinc-950 sm:rounded-[2rem] sm:p-8">
          <div className="grid gap-6 sm:gap-8 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-6">
              <Badge tone="orange">Your turn</Badge>
              <h2 className="mt-3 font-display text-4xl font-semibold leading-[0.95] tracking-tight text-zinc-950 dark:text-zinc-50 sm:mt-4 sm:text-6xl">
                Own your{" "}
                <NairaTermBadge
                  term="name"
                  tone="orange"
                  className="relative -top-1.5 px-3.5 py-1.5 text-xl sm:-top-2 sm:px-5 sm:py-2.5 sm:text-3xl"
                />
                .
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-6 text-zinc-700 dark:text-zinc-200 sm:mt-5 sm:text-base sm:leading-7">
                Claim a name people will remember, link where money should land,
                and make getting paid feel simple.
              </p>
              <div className="mt-5 flex flex-col gap-3 sm:mt-6 sm:flex-row">
                <ButtonLink href="/claim">
                  Claim your <NairaTermBadge term="handle" tone="inverted" />
                </ButtonLink>
                <ButtonLink href="#telegram-bot" variant="secondary">
                  Open Telegram
                </ButtonLink>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="rounded-[1.7rem] bg-white/85 p-4 shadow-sm dark:bg-zinc-950/45 sm:rounded-[2rem] sm:p-5">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                    Ready to share
                  </div>
                  <Badge tone="verify">Verified</Badge>
                </div>
                <div className="mt-5 text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 sm:mt-8 sm:text-5xl">
                  <Naira />
                  yourname
                </div>
                <div className="-mx-1 mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:mt-5 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:pb-0">
                  <div className="min-w-[10.5rem] shrink-0 snap-center rounded-2xl bg-orange-50 p-3.5 text-sm font-semibold text-orange-900 dark:bg-orange-950/25 dark:text-orange-100 sm:min-w-0 sm:p-4">
                    Pay link
                  </div>
                  <div className="min-w-[10.5rem] shrink-0 snap-center rounded-2xl bg-emerald-50 p-3.5 text-sm font-semibold text-emerald-900 dark:bg-emerald-950/25 dark:text-emerald-100 sm:min-w-0 sm:p-4">
                    Public profile
                  </div>
                  <div className="min-w-[10.5rem] shrink-0 snap-center rounded-2xl bg-zinc-950 p-3.5 text-sm font-semibold text-white dark:bg-white dark:text-zinc-950 sm:min-w-0 sm:p-4">
                    Telegram
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
