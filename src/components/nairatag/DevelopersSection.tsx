import { Badge, ButtonLink, CodeBlock, Container, NairaTermBadge } from "./ui";

function ApiPill({ label }: { label: string }) {
  return (
    <div className="rounded-2xl bg-white/80 px-4 py-3 text-sm font-semibold text-zinc-700 shadow-sm dark:bg-zinc-950/45 dark:text-zinc-200">
      {label}
    </div>
  );
}

export function DevelopersSection() {
  return (
    <section id="developers" className="py-10 sm:py-16">
      <Container>
        <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-5">
            <Badge tone="orange">For developers</Badge>
            <h2 className="mt-4 max-w-xl font-display text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-5xl">
              Add identity previews without changing settlement.
            </h2>
            <p className="mt-4 max-w-lg text-base leading-7 text-zinc-700 dark:text-zinc-200">
              Resolve <NairaTermBadge term="handles" tone="neutral" /> from your
              send screen, invoice flow, marketplace, or payout tool.
            </p>
            <p className="mt-3 max-w-lg text-sm leading-6 text-zinc-600 dark:text-zinc-300">
              The current public stack includes direct NairaTag resolution,
              ENS-aware wallet execution, and ENS text-record publishing for
              verified public metadata like Telegram aliases.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="#claim">Start building</ButtonLink>
              <ButtonLink href="#identity-stack" variant="secondary">
                View identity rails
              </ButtonLink>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="rounded-[2rem] bg-zinc-950 p-5 text-white shadow-sm">
              <div className="flex items-center justify-between">
                <Badge tone="inverted">API access</Badge>
                <div className="text-xs font-semibold text-white/45">v1</div>
              </div>
              <div className="mt-5">
                <CodeBlock
                  className="border-white/10 bg-black/45"
                  code={'GET /resolve?handle=victor\n\n{\n  "handle": "victor",\n  "displayName": "Victor Adeyemi",\n  "bank": "GTBank",\n  "verification": "verified"\n}'}
                />
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-4">
                <ApiPill label="Resolve" />
                <ApiPill label="Preview" />
                <ApiPill label="Verify" />
                <ApiPill label="Confirm" />
              </div>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div className="rounded-[1.7rem] bg-orange-50 p-5 dark:bg-orange-950/25">
                <div className="text-3xl font-semibold text-zinc-950 dark:text-zinc-50">
                  1 call
                </div>
                <div className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                  Fetch recipient identity.
                </div>
              </div>
              <div className="rounded-[1.7rem] bg-white/80 p-5 dark:bg-zinc-950/35">
                <div className="text-3xl font-semibold text-zinc-950 dark:text-zinc-50">
                  JSON
                </div>
                <div className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                  Return clean preview payloads.
                </div>
              </div>
              <div className="rounded-[1.7rem] bg-emerald-50 p-5 dark:bg-emerald-950/20">
                <div className="text-3xl font-semibold text-zinc-950 dark:text-zinc-50">
                  UI
                </div>
                <div className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                  Show trust before payment.
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
