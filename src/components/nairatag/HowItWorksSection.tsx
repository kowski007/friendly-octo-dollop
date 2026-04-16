import type { ReactNode } from "react";

import {
  Badge,
  ButtonLink,
  Card,
  CheckIcon,
  Container,
  NairaTermBadge,
  cn,
} from "./ui";

function Naira({ className }: { className?: string }) {
  return (
    <span className={cn("font-semibold", className)} aria-hidden="true">
      {"\u20A6"}
    </span>
  );
}

function StepCard({
  index,
  title,
  description,
  featured = false,
  children,
}: {
  index: string;
  title: ReactNode;
  description: string;
  featured?: boolean;
  children?: ReactNode;
}) {
  return (
    <Card
      className={cn(
        "relative overflow-hidden p-6",
        featured &&
          "border-orange-200/70 bg-orange-50/60 dark:border-orange-900/50 dark:bg-orange-950/20"
      )}
    >
      <div className="absolute -top-8 -right-6 select-none text-[72px] font-semibold tracking-tight text-zinc-950/6 dark:text-white/10">
        {index}
      </div>
      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <Badge tone={featured ? "orange" : "neutral"}>Step {index}</Badge>
          {featured ? (
            <Badge tone="verify">
              <CheckIcon className="h-3.5 w-3.5" />
              Verified
            </Badge>
          ) : null}
        </div>
        <div className="mt-4 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
          {title}
        </div>
        <div className="mt-2 text-sm leading-7 text-zinc-600 dark:text-zinc-300">
          {description}
        </div>
        {children ? <div className="mt-4">{children}</div> : null}
      </div>
    </Card>
  );
}

export function HowItWorksSection() {
  return (
    <section id="how" className="py-16 sm:py-24">
      <Container>
        <div className="grid gap-10 lg:grid-cols-12 lg:items-start">
          <div className="lg:col-span-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200/70 bg-white/70 px-3 py-1 text-xs font-semibold text-zinc-700 shadow-sm backdrop-blur dark:border-zinc-800/80 dark:bg-zinc-950/30 dark:text-zinc-200">
              How it works
            </div>
            <h2 className="mt-4 font-display text-4xl font-semibold leading-[1.03] tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-5xl">
              Your{" "}
              <NairaTermBadge
                term="handle"
                tone="orange"
                className="relative -top-1 px-3.5 py-1.5 text-base sm:px-4 sm:py-2 sm:text-lg"
              />{" "}
              becomes your payment identity.
            </h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-zinc-700 dark:text-zinc-200">
              Claim a name you’ll actually remember, link your bank once, then
              send and receive with confidence because the recipient identity is
              shown first.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="#demo">See the live demo</ButtonLink>
              <ButtonLink href="#features" variant="secondary">
                Explore platform features
              </ButtonLink>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="grid gap-5 sm:grid-cols-2">
              <StepCard
                index="01"
                title={
                  <>
                    Claim your{" "}
                    <NairaTermBadge term="handle" tone="orange" size="md" />
                  </>
                }
                description="Pick a simple name. It’s easier to share than an account number."
              >
                <div className="rounded-2xl border border-zinc-200/70 bg-white/70 px-4 py-3 text-sm font-semibold text-zinc-950 dark:border-zinc-800/80 dark:bg-zinc-950/25 dark:text-zinc-50">
                  <Naira />
                  mikki{" "}
                  <span className="ml-2 rounded-full bg-orange-50 px-2 py-1 text-xs font-semibold text-orange-900 dark:bg-orange-950/30 dark:text-orange-100">
                    Available
                  </span>
                </div>
              </StepCard>

              <StepCard
                index="02"
                title="Link your bank account"
                description="Connect once. Your handle points to a verified bank destination."
                featured
              >
                <div className="rounded-2xl border border-orange-200/60 bg-white/60 px-4 py-3 text-sm font-semibold text-zinc-950 dark:border-orange-900/50 dark:bg-zinc-950/20 dark:text-zinc-50">
                  GTBank{" "}
                  <span className="text-zinc-500 dark:text-zinc-400">••••</span>{" "}
                  1802
                </div>
              </StepCard>

              <StepCard
                index="03"
                title="Verify identity signals"
                description="Show names, banks, and badges before sending to reduce mistakes."
              >
                <div className="flex flex-wrap gap-2">
                  <Badge tone="verify">BVN checks</Badge>
                  <Badge tone="verify">Account name match</Badge>
                  <Badge tone="verify">Business badge</Badge>
                </div>
              </StepCard>

              <StepCard
                index="04"
                title="Send and receive by name"
                description="Use handles in send flows, invoices, and payouts across apps."
              >
                <div className="rounded-2xl border border-zinc-200/70 bg-white/70 p-4 dark:border-zinc-800/80 dark:bg-zinc-950/25">
                  <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                    Recipient preview
                  </div>
                  <div className="mt-2 text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                    <Naira />
                    mama_ijebu{" "}
                    <span className="ml-2 text-emerald-700 dark:text-emerald-300">
                      ✓ Verified
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
                    Iya Basira (Mama Ijebu) · UBA
                  </div>
                </div>
              </StepCard>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
