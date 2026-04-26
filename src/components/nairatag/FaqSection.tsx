import Link from "next/link";

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
    title: "Can protected names be bought on the marketplace?",
    body: (
      <>
        No. Protected names are not sold as open inventory. Government,
        regulatory, financial, brand, religious, and other sensitive identity
        namespaces stay out of the public premium marketplace and are only
        assigned after manual review and verification.
      </>
    ),
    tone: "gray",
  },
  {
    title: "What happens if a name is premium, reserved, or blocked?",
    body: (
      <>
        NairaTag checks the live Name Index before any claim. Public names can
        be claimed. Premium names are reviewed as paid inventory. Protected
        names are reserved for governments, regulated institutions, brands, and
        sensitive public or religious identities. Blocked names are never made
        available publicly. See the{" "}
        <Link
          href="/name-policy"
          className="font-semibold underline decoration-zinc-400 underline-offset-4 transition hover:decoration-zinc-700 dark:decoration-zinc-500 dark:hover:decoration-zinc-200"
        >
          name policy
        </Link>{" "}
        for the full rule set.
      </>
    ),
    tone: "orange",
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
    title: "How do reserved names get approved?",
    body: (
      <>
        Reserved names are not self-serve. Government bodies, regulated
        institutions, brands, and other protected entities are reviewed
        manually. NairaTag can require documentary proof such as incorporation
        records, official domains, trademark evidence, regulatory approvals, or
        delegated authority before a reserved name is assigned and verified.
      </>
    ),
    tone: "blue",
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
        Handles are designed to be easy to type and share. Use 2-32 characters
        made up of letters, numbers, underscores, or periods. Examples:{" "}
        {NAIRA}mama_ijebu, {NAIRA}mikki, {NAIRA}fioso, {NAIRA}team.ng.
      </>
    ),
    tone: "gray",
  },
  {
    title: "Is NairaTag a bank or a wallet?",
    body: (
      <>
        No. NairaTag is an identity layer. Money can still move through your
        bank, fintech, card processor, or crypto wallet. NairaTag adds a
        human-readable <NairaTermBadge term="handle" tone="neutral" /> and
        policy-aware recipient verification before payment is confirmed.
      </>
    ),
    tone: "gray",
  },
  {
    title: "How do fintechs integrate?",
    body: (
      <>
        Fintechs can resolve <NairaTermBadge term="handles" tone="neutral" />{" "}
        via API, display recipient verification, and route payment collection
        or payouts inside their own flows. The same namespace and policy layer
        also powers premium names, reserved names, and marketplace listings.
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
              <ButtonLink href="/name-policy">View name policy</ButtonLink>
              <ButtonLink href="#claim" variant="secondary">
                Claim a <NairaTermBadge term="handle" tone="orange" />
              </ButtonLink>
            </div>

            <p className="mt-5 max-w-xl text-sm leading-7 text-zinc-600 dark:text-zinc-300">
              Legal pages:{" "}
              <Link
                href="/terms"
                className="font-semibold underline decoration-zinc-300 underline-offset-4 transition hover:decoration-zinc-500 dark:decoration-zinc-700 dark:hover:decoration-zinc-300"
              >
                Terms
              </Link>
              ,{" "}
              <Link
                href="/privacy"
                className="font-semibold underline decoration-zinc-300 underline-offset-4 transition hover:decoration-zinc-500 dark:decoration-zinc-700 dark:hover:decoration-zinc-300"
              >
                Privacy
              </Link>
              , and{" "}
              <Link
                href="/name-policy"
                className="font-semibold underline decoration-zinc-300 underline-offset-4 transition hover:decoration-zinc-500 dark:decoration-zinc-700 dark:hover:decoration-zinc-300"
              >
                Name policy
              </Link>
              .
            </p>
          </div>

          <div className="lg:col-span-6">
            <FaqAccordion items={items} defaultOpenIndex={1} />
          </div>
        </div>
      </Container>
    </section>
  );
}
