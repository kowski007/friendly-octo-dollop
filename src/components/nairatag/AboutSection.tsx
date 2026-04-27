import { Badge, Container, NairaTermBadge, cn } from "./ui";

function Naira({ className }: { className?: string }) {
  return (
    <span className={cn("font-semibold", className)} aria-hidden="true">
      {"\u20A6"}
    </span>
  );
}

function ImpactCard({
  label,
  value,
  detail,
  tone = "neutral",
}: {
  label: string;
  value: string;
  detail: string;
  tone?: "neutral" | "orange";
}) {
  return (
    <div
      className={cn(
        "min-w-[11.75rem] shrink-0 snap-center rounded-[1.4rem] p-4 shadow-sm sm:min-w-0 sm:rounded-[1.7rem] sm:p-5",
        tone === "orange"
          ? "bg-orange-50 dark:bg-orange-950/25"
          : "bg-white/80 dark:bg-zinc-950/35"
      )}
    >
      <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
        {label}
      </div>
      <div className="mt-4 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 sm:mt-8 sm:text-4xl">
        {value}
      </div>
      <div className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
        {detail}
      </div>
    </div>
  );
}

export function AboutSection() {
  return (
    <section id="about" className="py-8 sm:py-16">
      <Container>
        <div className="grid gap-6 sm:gap-8 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-5">
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">
              About
            </div>
            <div className="mt-4 text-5xl font-semibold leading-none tracking-tight text-zinc-950 dark:text-zinc-50 sm:mt-6 sm:text-8xl">
              10 digits
            </div>
            <div className="mt-3 flex flex-wrap gap-2 sm:mt-4">
              <Badge>Hard to remember</Badge>
              <Badge>Easy to mistype</Badge>
              <Badge tone="orange">Ready to replace</Badge>
            </div>
            <p className="mt-4 max-w-lg text-sm leading-6 text-zinc-700 dark:text-zinc-200 sm:mt-6 sm:text-base sm:leading-7">
              NairaTag makes Nigerian payments feel like paying a person, not
              copying a number. A <NairaTermBadge term="handle" tone="neutral" />{" "}
              resolves into the identity proof users need at the moment of
              decision.
            </p>
          </div>

          <div className="lg:col-span-7">
            <div className="rounded-[1.7rem] bg-white/80 p-4 shadow-sm backdrop-blur dark:bg-zinc-950/35 sm:rounded-[2rem] sm:p-6">
              <div className="flex items-start justify-between gap-6">
                <div>
                  <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                    Platform thesis
                  </div>
                  <div className="mt-3 max-w-md text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 sm:mt-4 sm:text-3xl">
                    The account number should be infrastructure. The name should
                    be the interface.
                  </div>
                </div>
                <div className="hidden rounded-2xl bg-zinc-950 px-4 py-3 text-sm font-semibold text-white dark:bg-white dark:text-zinc-950 sm:block">
                  <Naira />
                  name
                </div>
              </div>

              <div className="-mx-1 mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:mt-6 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:pb-0">
                <ImpactCard label="From" value="10" detail="digits" />
                <ImpactCard label="To" value="1" detail="handle" tone="orange" />
                <ImpactCard label="With" value="ID" detail="preview" />
              </div>

              <div className="mt-3 rounded-[1.4rem] bg-gradient-to-r from-orange-300 via-orange-100 to-white p-4 dark:from-orange-600/65 dark:via-orange-950/35 dark:to-zinc-950 sm:mt-4 sm:rounded-[1.7rem] sm:p-5">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div>
                    <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">
                      Example
                    </div>
                    <div className="mt-2 text-lg font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-2xl">
                      <Naira />
                      victor {"->"} Victor Adeyemi - GTBank
                    </div>
                  </div>
                  <Badge tone="verify">Verified</Badge>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
