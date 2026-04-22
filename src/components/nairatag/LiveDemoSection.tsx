import { HandleDemo } from "./HandleDemo";
import { Badge, ButtonLink, CheckIcon, Container, NairaTermBadge } from "./ui";

function SignalRow({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-white/70 px-4 py-3 text-sm font-semibold text-zinc-700 shadow-sm dark:bg-zinc-950/35 dark:text-zinc-200">
      <span>{label}</span>
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">
        <CheckIcon className="h-4 w-4" />
      </span>
    </div>
  );
}

export function LiveDemoSection() {
  return (
    <section id="demo" className="py-10 sm:py-16">
      <Container>
        <div className="grid gap-8 lg:grid-cols-12 lg:items-start">
          <div className="lg:col-span-5">
            <Badge tone="orange">Live demo</Badge>
            <h2 className="mt-4 font-display text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-5xl">
              Type a{" "}
              <NairaTermBadge
                term="handle"
                tone="orange"
                className="relative -top-1 px-3.5 py-1.5 text-base sm:px-4 sm:py-2 sm:text-lg"
              />
              . See identity instantly.
            </h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-zinc-700 dark:text-zinc-200">
              The demo is the whole product idea in one move: type a name,
              receive a usable identity preview.
            </p>

            <div className="mt-6 grid gap-3">
              <SignalRow label="Recipient name" />
              <SignalRow label="Bank destination" />
              <SignalRow label="Verification badge" />
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
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
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div className="rounded-[1.7rem] bg-orange-50 p-5 shadow-sm dark:bg-orange-950/25">
                <div className="text-3xl font-semibold text-zinc-950 dark:text-zinc-50">
                  2 sec
                </div>
                <div className="mt-2 text-sm font-semibold text-zinc-600 dark:text-zinc-300">
                  Resolve flow
                </div>
              </div>
              <div className="rounded-[1.7rem] bg-emerald-50 p-5 shadow-sm dark:bg-emerald-950/20">
                <div className="text-3xl font-semibold text-zinc-950 dark:text-zinc-50">
                  ID
                </div>
                <div className="mt-2 text-sm font-semibold text-zinc-600 dark:text-zinc-300">
                  Preview first
                </div>
              </div>
              <div className="rounded-[1.7rem] bg-zinc-950 p-5 text-white shadow-sm">
                <div className="text-3xl font-semibold">Pay</div>
                <div className="mt-2 text-sm font-semibold text-white/70">
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
