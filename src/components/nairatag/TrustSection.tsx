import { Badge, Container, cn } from "./ui";

function Naira({ className }: { className?: string }) {
  return (
    <span className={cn("font-semibold", className)} aria-hidden="true">
      {"\u20A6"}
    </span>
  );
}

function TrustPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[12rem] shrink-0 snap-center rounded-[1.4rem] bg-zinc-50 p-4 dark:bg-zinc-950/45 sm:min-w-0 sm:rounded-[1.7rem] sm:p-5">
      <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">{label}</div>
      <div className="mt-3 text-base font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-lg">
        {value}
      </div>
    </div>
  );
}

export function TrustSection() {
  return (
    <section id="trust" className="py-8 sm:py-16">
      <Container>
        <div className="grid gap-6 sm:gap-8 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-5">
            <Badge tone="verify">Trust</Badge>
            <div className="mt-4 text-4xl font-semibold leading-tight tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-6xl">
              Let people feel safe before they send.
            </div>
            <p className="mt-4 max-w-md text-sm leading-6 text-zinc-700 dark:text-zinc-200 sm:text-base sm:leading-7">
              The tag is not just cute. It carries the signals people need before
              money moves.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Badge tone="verify">BVN linked</Badge>
              <Badge tone="orange">Bank matched</Badge>
              <Badge>Public profile</Badge>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="rounded-[1.7rem] bg-white/80 p-4 shadow-sm backdrop-blur dark:bg-zinc-950/35 sm:rounded-[2rem] sm:p-6">
              <div className="rounded-[1.4rem] bg-gradient-to-r from-orange-300 via-orange-100 to-zinc-100 p-4 dark:from-orange-600/70 dark:via-orange-950/35 dark:to-zinc-900 sm:rounded-[1.7rem] sm:p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">
                      What people see
                    </div>
                    <div className="mt-3 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-3xl">
                      Name, bank, and trust signals before they confirm.
                    </div>
                  </div>
                  <Badge tone="verify">Verified</Badge>
                </div>
              </div>

              <div className="-mx-1 mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:mt-4 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:pb-0">
                <TrustPill label="Identity" value="Real recipient preview" />
                <TrustPill label="Payout" value="Linked destination" />
                <TrustPill label="Confidence" value="Safer to confirm" />
              </div>

              <div className="mt-3 rounded-[1.4rem] bg-zinc-950 p-4 text-white sm:mt-4 sm:rounded-[1.7rem] sm:p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-semibold text-white/55">Example</div>
                    <div className="mt-2 text-xl font-semibold sm:text-2xl">
                      <Naira />
                      victor
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-semibold text-white/55">Status</div>
                    <div className="mt-2 text-xs font-semibold text-emerald-300 sm:text-sm">
                      Good to send
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
