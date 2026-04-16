import {
  Badge,
  ButtonLink,
  Card,
  CheckIcon,
  CodeBlock,
  Container,
  NairaTermBadge,
} from "./ui";

export function DevelopersSection() {
  return (
    <section id="developers" className="py-16 sm:py-24">
      <Container>
        <div className="grid gap-10 lg:grid-cols-12 lg:items-start">
          <div className="lg:col-span-5">
            <Badge tone="orange">For developers</Badge>
            <h2 className="mt-4 font-display text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-5xl">
              Built for fintechs and apps.
            </h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-zinc-700 dark:text-zinc-200">
              Resolve handles instantly and show identity previews inside your
              existing payment flows. Keep settlement on your current rails;
              upgrade the UX and safety layer.
            </p>

            <div className="mt-6 space-y-3 text-sm text-zinc-700 dark:text-zinc-200">
              {[
                <>
                  Resolve <NairaTermBadge term="handles" tone="neutral" /> to
                  recipient preview payloads
                </>,
                "Return verification status (personal, business)",
                "Surface fraud signals and safety flags in UI",
                "Designed to fit send flows, invoices, and payouts",
              ].map((t, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">
                    <CheckIcon className="h-4 w-4" />
                  </span>
                  <span>{t}</span>
                </div>
              ))}
            </div>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="#claim">Start building</ButtonLink>
              <ButtonLink href="#faq" variant="secondary">
                Read FAQs
              </ButtonLink>
            </div>
          </div>

          <div className="lg:col-span-7">
            <CodeBlock code={"GET /resolve?handle=victor"} />
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <Card className="p-6">
                <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                  Resolve instantly
                </div>
                <div className="mt-2 text-sm leading-7 text-zinc-600 dark:text-zinc-300">
                  Return recipient name + bank destination so your UI can
                  confirm identity before send.
                </div>
              </Card>
              <Card className="p-6">
                <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                  Display badges
                </div>
                <div className="mt-2 text-sm leading-7 text-zinc-600 dark:text-zinc-300">
                  Show Verified and Business badges in a consistent, user-trusted
                  pattern.
                </div>
              </Card>
              <Card className="p-6">
                <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                  Safer payouts
                </div>
                <div className="mt-2 text-sm leading-7 text-zinc-600 dark:text-zinc-300">
                  Use handle resolution in refunds, creator payouts, and vendor
                  disbursements.
                </div>
              </Card>
              <Card className="p-6">
                <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                  Partner-friendly
                </div>
                <div className="mt-2 text-sm leading-7 text-zinc-600 dark:text-zinc-300">
                  Designed to integrate cleanly into fintech products without
                  changing how you settle.
                </div>
              </Card>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
