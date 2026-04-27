import { Badge, ButtonLink, Card, Container, NairaTermBadge } from "./ui";

const NAIRA = "\u20A6";
const BOT_USERNAME =
  process.env.NEXT_PUBLIC_NT_TELEGRAM_BOT_USERNAME || "MyNairatagbot";
const TELEGRAM_BOT_URL = `https://t.me/${BOT_USERNAME}`;

function RailRow({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "verify" | "orange";
}) {
  return (
    <div className="rounded-[1.1rem] border border-zinc-200/70 bg-white/88 px-4 py-3 dark:border-zinc-800/80 dark:bg-zinc-950/45">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
            {label}
          </div>
          <div className="mt-1 truncate text-sm font-semibold text-zinc-950 dark:text-zinc-50">
            {value}
          </div>
        </div>
        <Badge tone={tone} className="shrink-0 px-2 py-0.5 text-[11px]">
          {tone === "verify"
            ? "Live"
            : tone === "orange"
              ? "Managed"
              : "Current"}
        </Badge>
      </div>
    </div>
  );
}

function ActionPill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-zinc-200/70 bg-white/82 px-2.5 py-1 text-[11px] font-semibold text-zinc-700 dark:border-zinc-800/80 dark:bg-zinc-950/45 dark:text-zinc-200">
      {label}
    </span>
  );
}

export function IdentityStackSection() {
  return (
    <section id="identity-stack" className="py-8 sm:py-12">
      <Container>
        <div className="grid gap-4 xl:grid-cols-[1.02fr_0.98fr]">
          <Card className="p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="orange">Behind the scenes</Badge>
              <Badge tone="neutral">ENS-aware</Badge>
            </div>

            <h2 className="mt-3 max-w-2xl font-display text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-3xl">
              Your <NairaTermBadge term="handle" tone="verify" size="md" /> can live on NairaTag, Telegram, and ENS.
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-700 dark:text-zinc-200">
              Simple on the surface. Solid underneath.
            </p>

            <div className="mt-4 grid gap-2.5">
              <RailRow
                label="App resolver"
                value={`${NAIRA}victor -> recipient preview`}
                tone="verify"
              />
              <RailRow
                label="ENS execution"
                value={`${NAIRA}victor -> victor.nairatag.eth -> Base address`}
                tone="verify"
              />
              <RailRow
                label="ENS text"
                value="org.telegram = victor7593"
                tone="orange"
              />
            </div>

            <div className="mt-3 rounded-[1.1rem] border border-zinc-200/70 bg-zinc-50/90 px-4 py-2.5 text-xs leading-5 text-zinc-600 dark:border-zinc-800/80 dark:bg-zinc-900/45 dark:text-zinc-300">
              DNS is not the main public claim rail today.
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <ButtonLink href="#faq">How it works</ButtonLink>
              <ButtonLink href="#faq" variant="secondary">
                FAQs
              </ButtonLink>
            </div>
          </Card>

          <div id="telegram-bot">
            <Card className="p-5 sm:p-6">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="verify">Telegram bot</Badge>
                <Badge tone="neutral">@{BOT_USERNAME}</Badge>
              </div>

              <h3 className="mt-3 font-display text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-3xl">
                Claim and share inside Telegram.
              </h3>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-700 dark:text-zinc-200">
                Claim a tag, look people up, open pay pages, and carry the same
                identity into Telegram.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <ActionPill label={`Claim ${NAIRA}handle`} />
                <ActionPill label="Send money" />
                <ActionPill label="Receive money" />
                <ActionPill label="Marketplace" />
                <ActionPill label="Publish to ENS" />
              </div>

              <div className="mt-4 rounded-[1.1rem] border border-zinc-200/70 bg-white/82 px-4 py-3 text-xs leading-5 text-zinc-600 dark:border-zinc-800/80 dark:bg-zinc-950/45 dark:text-zinc-300">
                Telegram handles the conversation. ENS handles the public alias layer.
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <ButtonLink href={TELEGRAM_BOT_URL}>Open Telegram bot</ButtonLink>
                <ButtonLink href="/claim" variant="secondary">
                  Claim on web
                </ButtonLink>
              </div>
            </Card>
          </div>
        </div>
      </Container>
    </section>
  );
}
