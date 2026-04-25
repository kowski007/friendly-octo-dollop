import { Card, Container, SectionHeader, cn } from "./ui";

type Client = {
  name: string;
  sector: string;
  summary: string;
  accent: "orange" | "emerald" | "sky" | "violet" | "zinc";
};

const clients: Client[] = [
  {
    name: "Brunch24",
    sector: "Food and merchant checkout",
    summary: "Restaurant orders, vendor payouts, and neighborhood commerce.",
    accent: "orange",
  },
  {
    name: "Payveri",
    sector: "Freelance payouts",
    summary: "Cleaner recipient identity for contractor disbursements and salary runs.",
    accent: "emerald",
  },
  {
    name: "MovieFlix",
    sector: "Creator and streaming flows",
    summary: "Subscription drops, fan payments, and creator withdrawals.",
    accent: "sky",
  },
  {
    name: "CVAI",
    sector: "AI commerce",
    summary: "Verified payout identities for AI-led workflows and operator teams.",
    accent: "violet",
  },
  {
    name: "Every1.fun",
    sector: "Community rewards",
    summary: "Social claims, event payouts, and lightweight handle-first rewards.",
    accent: "zinc",
  },
];

function accentClasses(accent: Client["accent"]) {
  switch (accent) {
    case "orange":
      return {
        dot: "bg-orange-500",
        panel:
          "from-orange-100/90 via-white to-orange-50 dark:from-orange-950/35 dark:via-zinc-950 dark:to-orange-950/15",
        sector:
          "text-orange-700 dark:text-orange-200",
      };
    case "emerald":
      return {
        dot: "bg-emerald-500",
        panel:
          "from-emerald-100/90 via-white to-emerald-50 dark:from-emerald-950/30 dark:via-zinc-950 dark:to-emerald-950/15",
        sector:
          "text-emerald-700 dark:text-emerald-200",
      };
    case "sky":
      return {
        dot: "bg-sky-500",
        panel:
          "from-sky-100/90 via-white to-sky-50 dark:from-sky-950/30 dark:via-zinc-950 dark:to-sky-950/15",
        sector:
          "text-sky-700 dark:text-sky-200",
      };
    case "violet":
      return {
        dot: "bg-violet-500",
        panel:
          "from-violet-100/90 via-white to-violet-50 dark:from-violet-950/30 dark:via-zinc-950 dark:to-violet-950/15",
        sector:
          "text-violet-700 dark:text-violet-200",
      };
    default:
      return {
        dot: "bg-zinc-500",
        panel:
          "from-zinc-100/90 via-white to-zinc-50 dark:from-zinc-900/70 dark:via-zinc-950 dark:to-zinc-900/30",
        sector:
          "text-zinc-700 dark:text-zinc-200",
      };
  }
}

function renderWordmark(name: string) {
  if (name === "Brunch24") {
    return (
      <div className="flex items-end gap-1">
        <span className="text-[1.75rem] font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Brunch
        </span>
        <span className="mb-0.5 rounded-full bg-nt-orange px-2 py-0.5 text-[0.82rem] font-semibold text-white">
          24
        </span>
      </div>
    );
  }

  if (name === "Payveri") {
    return (
      <div className="text-[1.72rem] font-semibold tracking-[-0.04em] text-zinc-950 dark:text-zinc-50">
        Pay<span className="text-emerald-600 dark:text-emerald-300">veri</span>
      </div>
    );
  }

  if (name === "MovieFlix") {
    return (
      <div className="flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-2xl bg-zinc-950 text-xs font-semibold tracking-[0.18em] text-white dark:bg-white dark:text-zinc-950">
          MF
        </span>
        <span className="text-[1.65rem] font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          MovieFlix
        </span>
      </div>
    );
  }

  if (name === "CVAI") {
    return (
      <div className="text-[1.65rem] font-semibold uppercase tracking-[0.18em] text-zinc-950 dark:text-zinc-50">
        CVAI
      </div>
    );
  }

  return (
    <div className="text-[1.6rem] font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
      Every1<span className="text-zinc-400">.</span>fun
    </div>
  );
}

function ClientCard({ client }: { client: Client }) {
  const accent = accentClasses(client.accent);

  return (
    <Card className="rounded-[1.8rem]">
      <div className={cn("bg-gradient-to-br p-5", accent.panel)}>
        <div className="flex items-center justify-between gap-3">
          <span
            className={cn(
              "inline-flex h-2.5 w-2.5 rounded-full shadow-[0_0_0_5px_rgba(255,255,255,0.75)] dark:shadow-[0_0_0_5px_rgba(24,24,27,0.7)]",
              accent.dot
            )}
          />
          <div
            className={cn(
              "text-[11px] font-semibold uppercase tracking-[0.16em]",
              accent.sector
            )}
          >
            {client.sector}
          </div>
        </div>

        <div className="mt-7 min-h-[3rem]">{renderWordmark(client.name)}</div>

        <p className="mt-4 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
          {client.summary}
        </p>
      </div>
    </Card>
  );
}

export function ClientsSection() {
  return (
    <section id="clients" className="py-6 sm:py-10">
      <Container>
        <div className="rounded-[2rem] border border-zinc-200/70 bg-white/70 p-5 shadow-[0_18px_46px_rgba(15,23,42,0.06)] backdrop-blur dark:border-zinc-800/70 dark:bg-zinc-950/35 dark:shadow-[0_20px_46px_rgba(0,0,0,0.24)] sm:p-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <SectionHeader
              eyebrow="Client network"
              title="Teams already shaping payments around NairaTag."
              description="From payouts to commerce and creator flows, these launch partners are building handle-first money movement into the products people already use."
            />
            <div className="max-w-sm rounded-[1.5rem] border border-zinc-200/80 bg-zinc-50/90 px-4 py-3 text-sm leading-6 text-zinc-600 dark:border-zinc-800/80 dark:bg-zinc-900/60 dark:text-zinc-300">
              Real product surfaces matter more than theory. This is where the
              handle identity layer starts compounding across apps.
            </div>
          </div>

          <div className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {clients.map((client) => (
              <ClientCard key={client.name} client={client} />
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
