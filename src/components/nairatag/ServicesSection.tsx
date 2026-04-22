import { Badge, ButtonLink, Container, cn } from "./ui";

function Naira({ className }: { className?: string }) {
  return (
    <span className={cn("font-semibold", className)} aria-hidden="true">
      {"\u20A6"}
    </span>
  );
}

function MiniMetric({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-4xl">
        {value}
      </div>
      <div className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
        {label}
      </div>
    </div>
  );
}

function ServicePanel({
  title,
  caption,
  tone = "light",
}: {
  title: string;
  caption: string;
  tone?: "light" | "orange";
}) {
  const orange = tone === "orange";

  return (
    <div
      className={cn(
        "relative min-h-[220px] overflow-hidden rounded-[2rem] p-5 shadow-sm",
        orange
          ? "bg-orange-500 text-white"
          : "bg-white/80 text-zinc-950 dark:bg-zinc-950/35 dark:text-zinc-50"
      )}
    >
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "inline-flex h-9 w-9 items-center justify-center rounded-2xl text-sm font-semibold",
            orange ? "bg-white/15 text-white" : "bg-orange-50 text-orange-800 dark:bg-orange-950/30 dark:text-orange-100"
          )}
        >
          <Naira />
        </span>
        <span
          className={cn(
            "rounded-full px-3 py-1 text-xs font-semibold",
            orange ? "bg-white/15 text-white" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300"
          )}
        >
          Live
        </span>
      </div>

      <div className="mt-12">
        <div className="text-2xl font-semibold tracking-tight">{title}</div>
        <div className={cn("mt-2 text-sm leading-6", orange ? "text-white/85" : "text-zinc-600 dark:text-zinc-300")}>
          {caption}
        </div>
      </div>
    </div>
  );
}

function ApprovalMock() {
  return (
    <div className="rounded-[2rem] bg-zinc-50 p-5 dark:bg-zinc-950/55">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
          Payment request
        </div>
        <Badge tone="orange">Needs approval</Badge>
      </div>
      <div className="mt-5 rounded-2xl bg-white p-4 shadow-sm dark:bg-zinc-950">
        <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
          Send NGN 48,000 to <Naira />kemi_stores
        </div>
        <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          Kemi Stores Ltd - Access Bank
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            className="rounded-xl bg-zinc-950 px-3 py-2 text-xs font-semibold text-white dark:bg-white dark:text-zinc-950"
          >
            Approve
          </button>
          <button
            type="button"
            className="rounded-xl bg-zinc-100 px-3 py-2 text-xs font-semibold text-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
          >
            Review
          </button>
        </div>
      </div>
    </div>
  );
}

export function ServicesSection() {
  return (
    <section id="services" className="py-10 sm:py-16">
      <Container>
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <Badge tone="orange">Services</Badge>
            <h2 className="mt-4 max-w-2xl font-display text-4xl font-semibold leading-[1.02] tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-5xl">
              Services that sit around the transfer, not on top of it.
            </h2>
          </div>
          <p className="max-w-md text-base leading-7 text-zinc-700 dark:text-zinc-200">
            Consumer handles, payment links, marketplace trust, and API
            resolution all share the same verified identity layer.
          </p>
        </div>

        <div className="mt-8 rounded-[2rem] bg-zinc-100/70 p-4 shadow-sm backdrop-blur dark:bg-zinc-950/20 sm:p-5">
          <div className="grid gap-4 lg:grid-cols-3">
            <ServicePanel
              title="Add and manage handles"
              caption="Claim names, link banks, and share pay profiles in one flow."
            />
            <ServicePanel
              title="Set approvals and trust"
              caption="Verified previews reduce mistakes before money leaves."
              tone="orange"
            />
            <ServicePanel
              title="Pay how vendors want"
              caption="Use links, marketplace offers, QR, or API-powered send flows."
            />
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-12">
            <div className="rounded-[2rem] bg-white/85 p-5 shadow-sm dark:bg-zinc-950/35 lg:col-span-5">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
                Active handle
              </div>
              <div className="mt-5 flex items-end justify-between gap-4">
                <div>
                  <div className="text-5xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                    <Naira />
                    shop
                  </div>
                  <div className="mt-2 text-sm font-medium text-zinc-600 dark:text-zinc-300">
                    Shop by Kemi - Business
                  </div>
                </div>
                <Badge tone="verify">Verified</Badge>
              </div>
            </div>
            <div className="lg:col-span-7">
              <ApprovalMock />
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-6 sm:grid-cols-4">
          <MiniMetric value="50%" label="Less typing" />
          <MiniMetric value="30%" label="Cleaner lookup" />
          <MiniMetric value="28%" label="Fewer mistakes" />
          <MiniMetric value="70%" label="More confidence" />
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <ButtonLink href="#demo">
            Try the live demo <Naira className="ml-1" />
          </ButtonLink>
          <ButtonLink href="#faq" variant="secondary">
            Read FAQs
          </ButtonLink>
        </div>
      </Container>
    </section>
  );
}
