import { Badge, ButtonLink, Card, Container, NairaTermBadge } from "./ui";

export function FinalCtaSection() {
  return (
    <section id="claim" className="py-16 sm:py-24">
      <Container>
        <div className="overflow-hidden rounded-[36px] border border-zinc-200/70 bg-white/70 p-7 shadow-sm backdrop-blur dark:border-zinc-800/70 dark:bg-zinc-950/25 sm:p-10">
          <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
            <div>
              <Badge tone="orange">Final CTA</Badge>
              <h2 className="mt-4 font-display text-5xl font-semibold leading-[0.95] tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-6xl">
                Own your{" "}
                <NairaTermBadge
                  term="name"
                  tone="orange"
                  className="relative -top-2 px-4 py-2 text-2xl sm:px-5 sm:py-2.5 sm:text-3xl"
                />
                .
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-700 dark:text-zinc-200">
                Claim a{" "}
                <NairaTermBadge
                  term="handle"
                  tone="neutral"
                  className="relative -top-0.5"
                />{" "}
                you’ll actually remember, and make it easier for people to pay
                you with confidence.
              </p>
            </div>

            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <ButtonLink href="#demo">
                Claim your <NairaTermBadge term="handle" tone="inverted" />
              </ButtonLink>
              <ButtonLink href="#developers" variant="secondary">
                Start building
              </ButtonLink>
            </div>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            <Card className="p-6">
              <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                Simple to share
              </div>
              <div className="mt-2 text-sm leading-7 text-zinc-600 dark:text-zinc-300">
                Send a <NairaTermBadge term="handle" tone="orange" /> in chat,
                invoices, and social bios. It’s short and memorable.
              </div>
            </Card>
            <Card className="p-6">
              <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                Verified badges
              </div>
              <div className="mt-2 text-sm leading-7 text-zinc-600 dark:text-zinc-300">
                Clear verification UI helps people confirm the right recipient
                before paying.
              </div>
            </Card>
            <Card className="p-6">
              <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                Built for partners
              </div>
              <div className="mt-2 text-sm leading-7 text-zinc-600 dark:text-zinc-300">
                Fintechs can integrate handle resolution into their products via
                API.
              </div>
            </Card>
          </div>
        </div>
      </Container>
    </section>
  );
}
