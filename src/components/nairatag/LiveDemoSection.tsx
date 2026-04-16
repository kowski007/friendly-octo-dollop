import { HandleDemo } from "./HandleDemo";
import { Badge, ButtonLink, Card, CheckIcon, Container, NairaTermBadge } from "./ui";

export function LiveDemoSection() {
  return (
    <section id="demo" className="py-16 sm:py-24">
      <Container>
        <div className="grid gap-10 lg:grid-cols-12 lg:items-start">
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
              This is the interaction that matters most: before money is sent,
              users see the recipient name, bank destination, and verification
              badge.
            </p>

            <div className="mt-6 space-y-3">
              {[
                "Preview recipient identity in the send flow",
                "Show Verified and Business badges clearly",
                "Reduce wrong transfers with identity-first UI",
              ].map((t) => (
                <div key={t} className="flex items-start gap-2 text-sm">
                  <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">
                    <CheckIcon className="h-4 w-4" />
                  </span>
                  <span className="text-zinc-700 dark:text-zinc-200">{t}</span>
                </div>
              ))}
            </div>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="#claim">
                Claim your <NairaTermBadge term="handle" tone="inverted" />
              </ButtonLink>
              <ButtonLink href="#features" variant="secondary">
                Explore features
              </ButtonLink>
            </div>
          </div>

          <div className="lg:col-span-7">
            <HandleDemo defaultValue="mama_ijebu" />
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <Card className="p-6">
                <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                  Verified ✓ badge styling
                </div>
                <div className="mt-2 text-sm leading-7 text-zinc-600 dark:text-zinc-300">
                  A consistent green verification badge makes it obvious when a
                  recipient is confirmed.
                </div>
              </Card>
              <Card className="p-6">
                <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                  Clear recipient details
                </div>
                <div className="mt-2 text-sm leading-7 text-zinc-600 dark:text-zinc-300">
                  Show the name and bank destination in plain language, not
                  hidden behind account digits.
                </div>
              </Card>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
