import { HandleDemo } from "./HandleDemo";
import { Badge, ButtonLink, CheckIcon, Container, NairaTermBadge } from "./ui";

function SignalRow({ label }: { label: string }) {
  return (
    <div className="flex min-w-[12.25rem] shrink-0 snap-center items-center justify-between rounded-2xl bg-white/70 px-4 py-3 text-sm font-semibold text-zinc-700 shadow-sm dark:bg-zinc-950/35 dark:text-zinc-200 sm:min-w-0">
      <span>{label}</span>
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">
        <CheckIcon className="h-4 w-4" />
      </span>
    </div>
  );
}

export function LiveDemoSection() {
  return (
    <section id="demo" className="py-8 sm:py-16">
      <Container>
        <div className="grid gap-6 sm:gap-8 lg:grid-cols-12 lg:items-start">
          <div className="lg:col-span-5">
            <Badge tone="orange">Live demo</Badge>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 sm:mt-4 sm:text-5xl">
              Type a{" "}
              <NairaTermBadge
                term="handle"
                tone="orange"
                className="relative -top-1 px-3.5 py-1.5 text-base sm:px-4 sm:py-2 sm:text-lg"
              />
              . See identity instantly.
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-700 dark:text-zinc-200 sm:mt-4 sm:text-base sm:leading-7">
              Type one name, get one clean recipient preview.
            </p>

            <div className="-mx-1 mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:mt-6 sm:grid sm:overflow-visible sm:px-0 sm:pb-0">
              <SignalRow label="Recipient name" />
              <SignalRow label="Bank destination" />
              <SignalRow label="Verification badge" />
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:mt-6 sm:flex-row">
              <ButtonLink href="#claim">
                Claim your <NairaTermBadge term="handle" tone="inverted" />
              </ButtonLink>
              <ButtonLink href="#features" variant="secondary">
                Explore features
              </ButtonLink>
            </div>
          </div>

          <div className="lg:col-span-7">
            <HandleDemo />
            <div className="-mx-1 mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:mt-4 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:pb-0">
              <div className="min-w-[10.75rem] shrink-0 snap-center rounded-[1.4rem] bg-orange-50 p-4 shadow-sm dark:bg-orange-950/25 sm:min-w-0 sm:rounded-[1.7rem] sm:p-5">
                <div className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50 sm:text-3xl">
                  2 sec
                </div>
                <div className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-600 dark:text-zinc-300 sm:text-sm sm:tracking-normal">
                  Quick check
                </div>
              </div>
              <div className="min-w-[10.75rem] shrink-0 snap-center rounded-[1.4rem] bg-emerald-50 p-4 shadow-sm dark:bg-emerald-950/20 sm:min-w-0 sm:rounded-[1.7rem] sm:p-5">
                <div className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50 sm:text-3xl">
                  ID
                </div>
                <div className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-600 dark:text-zinc-300 sm:text-sm sm:tracking-normal">
                  Preview first
                </div>
              </div>
              <div className="min-w-[10.75rem] shrink-0 snap-center rounded-[1.4rem] bg-zinc-950 p-4 text-white shadow-sm sm:min-w-0 sm:rounded-[1.7rem] sm:p-5">
                <div className="text-2xl font-semibold sm:text-3xl">Pay</div>
                <div className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/70 sm:text-sm sm:tracking-normal">
                  Confirm later
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
