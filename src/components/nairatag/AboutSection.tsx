import { Badge, Card, Container, NairaTermBadge, cn } from "./ui";

function Naira({ className }: { className?: string }) {
  return (
    <span className={cn("font-semibold", className)} aria-hidden="true">
      {"\u20A6"}
    </span>
  );
}

function TinyIcon({ kind }: { kind: "id" | "shield" | "bank" }) {
  return (
    <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/70 text-zinc-950 shadow-sm backdrop-blur dark:bg-zinc-950/30 dark:text-zinc-50">
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
        {kind === "id" ? (
          <>
            <path
              d="M7 7h10v10H7V7z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <path
              d="M9 11h6M9 14h4"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </>
        ) : kind === "bank" ? (
          <>
            <path
              d="M4 10l8-4 8 4"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M6 10v8m4-8v8m4-8v8m4-8v8"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M5 18h14"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </>
        ) : (
          <>
            <path
              d="M12 3l8 4v6c0 5-3.4 9.2-8 10-4.6-.8-8-5-8-10V7l8-4z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <path
              d="M8.8 12.2l2.2 2.3 4.8-5"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        )}
      </svg>
    </span>
  );
}

export function AboutSection() {
  return (
    <section id="about" className="py-16 sm:py-24">
      <Container>
        <div className="grid gap-10 lg:grid-cols-12 lg:items-start">
          <div className="lg:col-span-5">
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">
              About
            </div>
            <div className="mt-6 font-display text-7xl font-semibold leading-none tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-8xl">
              10 digits
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge>Account numbers</Badge>
              <Badge>Easy to mistype</Badge>
              <Badge>Hard to verify</Badge>
            </div>
            <p className="mt-6 max-w-xl text-base leading-7 text-zinc-700 dark:text-zinc-200">
              Payments should feel like sending to a person, not copying a
              string of digits. NairaTag is an identity layer for Nigerian
              payments that resolves a{" "}
              <NairaTermBadge term="handle" tone="neutral" /> into a clear
              recipient preview.
            </p>
            <p className="mt-4 max-w-xl text-base leading-7 text-zinc-700 dark:text-zinc-200">
              The goal is simple: let users confirm who they’re paying, before
              they pay.
            </p>
          </div>

          <div className="lg:col-span-7">
            <div className="rounded-3xl border border-orange-200/70 bg-gradient-to-r from-orange-200/70 via-orange-50/60 to-white/70 p-6 shadow-sm backdrop-blur dark:border-orange-900/60 dark:from-orange-950/30 dark:via-orange-950/15 dark:to-zinc-950/25 sm:p-8">
              <div className="flex items-start justify-between gap-6">
                <div>
                  <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">
                    Preview first.
                  </div>
                  <div className="mt-4 text-5xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-6xl">
                    Verified
                  </div>
                  <div className="mt-2 max-w-md text-sm leading-7 text-zinc-700 dark:text-zinc-200">
                    The send flow can show badges and identity signals alongside
                    name + bank, so users know they’re paying the right person.
                  </div>
                </div>
                <div className="hidden sm:block">
                  <div className="rounded-2xl border border-white/40 bg-white/50 p-4 shadow-sm backdrop-blur dark:border-zinc-800/70 dark:bg-zinc-950/20">
                    <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                      Example
                    </div>
                    <div className="mt-2 text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                      <Naira />
                      victor{" "}
                      <span className="text-emerald-700 dark:text-emerald-300">
                        ✓
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
                      Victor Adeyemi · GTBank
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <Card className="p-6">
                <div className="flex items-start gap-3">
                  <TinyIcon kind="shield" />
                  <div>
                    <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                      Identity signals
                    </div>
                    <div className="mt-2 text-sm leading-7 text-zinc-600 dark:text-zinc-300">
                      BVN checks, business badges, and fraud signals are
                      presented clearly in the UI.
                    </div>
                  </div>
                </div>
              </Card>
              <Card className="p-6">
                <div className="flex items-start gap-3">
                  <TinyIcon kind="bank" />
                  <div>
                    <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                      Bank destination clarity
                    </div>
                    <div className="mt-2 text-sm leading-7 text-zinc-600 dark:text-zinc-300">
                      Users see the bank and recipient name before confirming a
                      transfer.
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
