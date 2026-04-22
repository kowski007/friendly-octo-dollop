import { Badge, Container, cn } from "./ui";

function Naira({ className }: { className?: string }) {
  return (
    <span className={cn("font-semibold", className)} aria-hidden="true">
      {"\u20A6"}
    </span>
  );
}

function MetricBox({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-[1.7rem] bg-zinc-50 p-5 dark:bg-zinc-950/45">
      <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
        {label}
      </div>
      <div className="mt-6 text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
        {value}
      </div>
      <div className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
        {detail}
      </div>
    </div>
  );
}

export function TrustSection() {
  return (
    <section id="trust" className="py-10 sm:py-16">
      <Container>
        <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-5">
            <Badge tone="verify">Trust & verification</Badge>
            <div className="mt-7 text-sm font-semibold text-zinc-500 dark:text-zinc-400">
              Identity confidence
            </div>
            <div className="mt-5 text-7xl font-semibold leading-none tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-8xl">
              86
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Badge tone="verify">BVN linked</Badge>
              <Badge tone="orange">Bank matched</Badge>
              <Badge>Public profile</Badge>
            </div>
            <p className="mt-6 max-w-md text-base leading-7 text-zinc-700 dark:text-zinc-200">
              Trust is shown where it matters: before the user confirms the
              transfer, offer, or payout.
            </p>
          </div>

          <div className="lg:col-span-7">
            <div className="rounded-[2rem] bg-white/80 p-5 shadow-sm backdrop-blur dark:bg-zinc-950/35 sm:p-6">
              <div className="rounded-[1.7rem] bg-gradient-to-r from-orange-300 via-orange-100 to-zinc-100 p-5 dark:from-orange-600/70 dark:via-orange-950/35 dark:to-zinc-900">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">
                      Deployed signal
                    </div>
                    <div className="mt-4 text-5xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                      68%
                    </div>
                  </div>
                  <div className="text-right text-xs font-semibold text-zinc-500 dark:text-zinc-300">
                    Target 2030
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <MetricBox label="Wrong-transfer risk" value="-42%" detail="with preview" />
                <MetricBox label="Verified handles" value="150+" detail="demo records" />
              </div>

              <div className="mt-4 rounded-[1.7rem] bg-zinc-950 p-5 text-white">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-semibold text-white/55">
                      Example payment
                    </div>
                    <div className="mt-3 text-2xl font-semibold">
                      <Naira />
                      victor
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-semibold text-white/55">
                      Status
                    </div>
                    <div className="mt-3 text-sm font-semibold text-emerald-300">
                      Safe to confirm
                    </div>
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
