import { Container, Badge, cn } from "./ui";

type Client = {
  name: string;
  sector: string;
  accent: "orange" | "emerald" | "sky" | "violet" | "zinc";
};

const clients: Client[] = [
  { name: "Brunch24", sector: "Merchant payouts", accent: "orange" },
  { name: "Payveri", sector: "Freelance payouts", accent: "emerald" },
  { name: "MovieFlix", sector: "Creator payments", accent: "sky" },
  { name: "CVAI", sector: "AI commerce", accent: "violet" },
  { name: "Every1.fun", sector: "Community rewards", accent: "zinc" },
];

function accentClasses(accent: Client["accent"]) {
  switch (accent) {
    case "orange":
      return "bg-orange-500 text-white";
    case "emerald":
      return "bg-emerald-500 text-white";
    case "sky":
      return "bg-sky-500 text-white";
    case "violet":
      return "bg-violet-500 text-white";
    default:
      return "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950";
  }
}

function ClientPill({ client }: { client: Client }) {
  return (
    <div className="flex min-w-[11.25rem] items-center gap-2.5 rounded-[1rem] border border-zinc-200/70 bg-white/92 px-3 py-2.5 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-950/72 sm:min-w-[12rem]">
      <span
        className={cn(
          "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold uppercase tracking-[0.14em]",
          accentClasses(client.accent)
        )}
      >
        {client.name.slice(0, 2)}
      </span>
      <div className="min-w-0">
        <div className="truncate text-[13px] font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          {client.name}
        </div>
        <div className="truncate text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
          {client.sector}
        </div>
      </div>
    </div>
  );
}

export function ClientsSection() {
  const rail = [...clients, ...clients];

  return (
    <section id="clients" className="py-5 sm:py-7">
      <Container>
        <div className="overflow-hidden rounded-[1.45rem] border border-zinc-200/70 bg-white/80 px-4 py-3.5 shadow-[0_16px_42px_rgba(15,23,42,0.06)] backdrop-blur dark:border-zinc-800/70 dark:bg-zinc-950/35 dark:shadow-[0_18px_42px_rgba(0,0,0,0.22)] sm:px-4.5 sm:py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex min-w-0 items-center gap-2.5">
              <Badge tone="neutral" className="px-2.5 py-1 text-[10px] uppercase tracking-[0.14em]">
                Client network
              </Badge>
              <div className="truncate text-sm font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                Teams already shipping with NairaTag
              </div>
            </div>
          </div>

          <div className="relative mt-3.5 overflow-hidden">
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-white via-white/75 to-transparent dark:from-zinc-950 dark:via-zinc-950/75" />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-white via-white/75 to-transparent dark:from-zinc-950 dark:via-zinc-950/75" />
            <div
              className="nt-client-marquee flex w-max gap-2.5 will-change-transform"
              style={{ animation: "nt-client-marquee 24s linear infinite" }}
            >
              {rail.map((client, index) => (
                <ClientPill key={`${client.name}:${index}`} client={client} />
              ))}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
