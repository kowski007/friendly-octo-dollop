import { ButtonLink, Container, NairaTermBadge } from "./ui";
import { FaqAccordion, type FaqItem } from "./FaqAccordion";

const NAIRA = "\u20A6";

const items: FaqItem[] = [
  {
    title: (
      <>
        What is a <NairaTermBadge term="handle" tone="neutral" />?
      </>
    ),
    body: (
      <>
        A <NairaTermBadge term="handle" tone="neutral" /> is a simple payment
        name like {NAIRA}victor that resolves to a clear recipient preview
        (name + bank), so users can confirm who they are paying before sending
        money.
      </>
    ),
    tone: "blue",
  },
  {
    title: "Is NairaTag a bank or a wallet?",
    body: (
      <>
        No. NairaTag is an identity layer. Your money can still move through
        your bank or fintech app; NairaTag adds a human-readable{" "}
        <NairaTermBadge term="handle" tone="neutral" /> and recipient
        verification UI before the transfer is confirmed.
      </>
    ),
    tone: "gray",
  },
  {
    title: "How does verification work?",
    body: (
      <>
        Verification is designed to use identity signals like BVN checks,
        account name matching, and business verification so the UI can show
        clear badges where it matters: right before a payment is sent.
      </>
    ),
    tone: "orange",
  },
  {
    title: (
      <>
        What characters are allowed in a{" "}
        <NairaTermBadge term="handle" tone="neutral" />?
      </>
    ),
    body: (
      <>
        Handles are designed to be easy to type and share. Use letters, numbers,
        and underscores, typically 2-20 characters. Examples: {NAIRA}mama_ijebu,
        {NAIRA}mikki, {NAIRA}fioso.
      </>
    ),
    tone: "gray",
  },
  {
    title: "How do fintechs integrate?",
    body: (
      <>
        Fintechs can resolve <NairaTermBadge term="handles" tone="neutral" />{" "}
        via a simple API call (for example: GET /resolve?handle=victor) and
        display the recipient preview inside existing send flows, invoices, and
        payouts.
      </>
    ),
    tone: "black",
  },
];

export function FaqSection() {
  return (
    <section id="faq" className="py-10 sm:py-16">
      <Container>
        <div className="grid gap-8 lg:grid-cols-12 lg:items-start">
          <div className="lg:col-span-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200/70 bg-white/70 px-3 py-1 text-xs font-semibold text-zinc-700 shadow-sm backdrop-blur dark:border-zinc-800/80 dark:bg-zinc-950/30 dark:text-zinc-200">
              FAQ
            </div>
            <h2 className="mt-4 font-display text-5xl font-semibold leading-[0.96] tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-6xl">
              Questions, answered.
            </h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-zinc-700 dark:text-zinc-200">
              The platform is designed to be simple: send money to a name, see
              identity instantly, and reduce wrong transfers. Here are the most
              common questions we get.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="#developers">Developer section</ButtonLink>
              <ButtonLink href="#claim" variant="secondary">
                Claim a <NairaTermBadge term="handle" tone="orange" />
              </ButtonLink>
            </div>
          </div>

          <div className="lg:col-span-6">
            <FaqAccordion items={items} defaultOpenIndex={1} />
          </div>
        </div>
      </Container>
    </section>
  );
}
