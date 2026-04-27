import { Badge, CheckIcon, Container, NairaTermBadge, cn } from "./ui";

function Naira({ className }: { className?: string }) {
  return (
    <span className={cn("font-semibold", className)} aria-hidden="true">
      {"\u20A6"}
    </span>
  );
}

function PhoneFrame() {
  return (
    <div className="relative mx-auto w-full max-w-[330px] rounded-[2rem] bg-white p-3 shadow-[0_24px_64px_rgba(15,23,42,0.12)] dark:bg-zinc-950">
      <div className="rounded-[1.5rem] bg-zinc-50 p-4 dark:bg-zinc-900/80">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            Send money
          </div>
          <Badge tone="orange">Preview</Badge>
        </div>

        <div className="mt-5 rounded-2xl bg-orange-50 p-4 dark:bg-orange-950/25">
          <div className="text-xs font-semibold text-orange-900/70 dark:text-orange-100/75">
            Recipient
          </div>
          <div className="mt-2 flex items-center justify-between gap-3">
            <div>
              <div className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                <Naira />
                victor
              </div>
              <div className="mt-1 text-sm font-medium text-zinc-600 dark:text-zinc-300">
                Victor Adeyemi
              </div>
            </div>
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-white">
              <CheckIcon className="h-5 w-5" />
            </span>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white p-3 dark:bg-zinc-950/70">
            <div className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
              Bank
            </div>
            <div className="mt-1 text-sm font-semibold text-zinc-950 dark:text-zinc-50">
              GTBank
            </div>
          </div>
          <div className="rounded-2xl bg-white p-3 dark:bg-zinc-950/70">
            <div className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
              Trust
            </div>
            <div className="mt-1 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
              Verified
            </div>
          </div>
        </div>

        <button
          type="button"
          className="mt-4 h-11 w-full rounded-2xl bg-zinc-950 text-sm font-semibold text-white dark:bg-white dark:text-zinc-950"
        >
          Confirm recipient
        </button>
      </div>
    </div>
  );
}

function MiniStep({
  index,
  title,
  detail,
}: {
  index: string;
  title: string;
  detail: string;
}) {
  return (
    <div className="rounded-3xl bg-white/75 p-5 shadow-sm backdrop-blur dark:bg-zinc-950/35">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-zinc-400 dark:text-zinc-500">
          {index}
        </span>
        <span className="h-2 w-2 rounded-full bg-orange-500" />
      </div>
      <div className="mt-5 text-base font-semibold text-zinc-950 dark:text-zinc-50">
        {title}
      </div>
      <div className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
        {detail}
      </div>
    </div>
  );
}

function ReceiptCard() {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm dark:bg-zinc-950">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
          Bank linked
        </div>
        <Badge tone="verify">Matched</Badge>
      </div>
      <div className="mt-5 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
        GTBank
      </div>
      <div className="mt-2 flex items-center justify-between rounded-2xl bg-zinc-100 px-4 py-3 text-sm font-semibold text-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
        <span>Victor Adeyemi</span>
        <span>1802</span>
      </div>
    </div>
  );
}

export function HowItWorksSection() {
  return (
    <section id="how" className="py-10 sm:py-16">
      <Container>
        <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-5">
            <Badge tone="orange">How it feels</Badge>
            <h2 className="mt-4 max-w-xl font-display text-4xl font-semibold leading-[1.03] tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-5xl">
              Turn your{" "}
              <NairaTermBadge
                term="name"
                tone="orange"
                className="relative -top-1 px-3.5 py-1.5 text-base sm:px-4 sm:py-2 sm:text-lg"
              />{" "}
              into your pay tag.
            </h2>
            <p className="mt-4 max-w-lg text-base leading-7 text-zinc-700 dark:text-zinc-200">
              Claim it, link where money should land, then share one clean tag people
              can trust.
            </p>
          </div>

          <div className="lg:col-span-7">
            <div className="grid gap-4 lg:grid-cols-5">
              <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-orange-100 via-white to-emerald-50 p-5 shadow-sm dark:from-orange-950/25 dark:via-zinc-950 dark:to-emerald-950/20 lg:col-span-3 lg:row-span-2">
                <PhoneFrame />
              </div>

              <div className="grid gap-4 lg:col-span-2">
                  <MiniStep
                  index="01"
                  title="Claim the tag"
                  detail="Pick something people will actually remember."
                />
                <ReceiptCard />
              </div>

              <div className="-mx-5 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden lg:col-span-5 lg:mx-0 lg:overflow-visible lg:px-0 lg:pb-0">
                <div className="flex snap-x snap-mandatory gap-4 sm:grid sm:min-w-0 sm:grid-cols-3 lg:flex-none">
                  <div className="min-w-[15.75rem] snap-start sm:min-w-0">
                    <MiniStep
                      index="02"
                      title="Link your payout"
                      detail="Add the bank or destination behind the tag."
                    />
                  </div>
                  <div className="min-w-[15.75rem] snap-start sm:min-w-0">
                    <MiniStep
                      index="03"
                      title="Use it everywhere"
                      detail="Share it in links, QR, Telegram, and payment flows."
                    />
                  </div>
                  <div className="min-w-[15.75rem] snap-start rounded-3xl bg-zinc-950 p-5 text-white shadow-sm dark:bg-white dark:text-zinc-950 sm:min-w-0">
                    <div className="text-xs font-semibold opacity-70">Result</div>
                    <div className="mt-5 text-3xl font-semibold tracking-tight">
                      1 name
                    </div>
                    <div className="mt-2 text-sm leading-6 opacity-80">
                      One tag people can actually use.
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
