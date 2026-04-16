import { Badge, Card, CheckIcon, Container } from "./ui";

function TrustCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Card className="p-6">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-200">
          <CheckIcon className="h-5 w-5" />
        </span>
        <div>
          <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
            {title}
          </div>
          <div className="mt-2 text-sm leading-7 text-zinc-600 dark:text-zinc-300">
            {description}
          </div>
        </div>
      </div>
    </Card>
  );
}

export function TrustSection() {
  return (
    <section id="trust" className="py-16 sm:py-24">
      <Container>
        <div className="grid gap-10 lg:grid-cols-12 lg:items-start">
          <div className="lg:col-span-5">
            <Badge tone="verify">Trust & verification</Badge>
            <h2 className="mt-4 font-display text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-5xl">
              Confidence before cash moves.
            </h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-zinc-700 dark:text-zinc-200">
              NairaTag is designed to show identity and verification signals in
              the exact moment that matters: before a user confirms a transfer.
            </p>

            <div className="mt-6 space-y-2">
              <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50/70 px-4 py-3 text-sm font-semibold text-emerald-950 shadow-sm backdrop-blur dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-100">
                ₦victor ✓ Verified
              </div>
              <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50/70 px-4 py-3 text-sm font-semibold text-emerald-950 shadow-sm backdrop-blur dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-100">
                ₦shop ✓✓ Business
              </div>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="grid gap-5 sm:grid-cols-2">
              <TrustCard
                title="BVN verification checks"
                description="Designed to connect handles to real identity signals that users can trust."
              />
              <TrustCard
                title="Account name matching"
                description="Show the recipient name before sending, not after confirmation."
              />
              <TrustCard
                title="Fraud protection signals"
                description="Surface safety flags and suspicious change signals in the UI."
              />
              <TrustCard
                title="Business identities"
                description="Separate merchants from personal handles with clear business badges."
              />
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

