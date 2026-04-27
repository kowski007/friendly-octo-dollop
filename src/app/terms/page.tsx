import { LegalPage } from "@/components/nairatag/LegalPage";

export const dynamic = "force-static";

const updatedAt = "April 26, 2026";

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Terms"
      title="Terms of Service"
      description="These terms govern use of the NairaTag web app, claim system, marketplace, payment identity services, and related tooling."
      updatedAt={updatedAt}
      sections={[
        {
          title: "1. Scope",
          body: (
            <>
              <p>
                NairaTag provides a handle-based identity layer, payment
                discovery surfaces, marketplace tooling, public trust pages, and
                supporting APIs. This can include web flows, pay pages,
                Telegram-bot product surfaces, and ENS-linked identity records
                where a user chooses to publish public metadata onchain. We may
                block, reserve, review, or reclassify handles to reduce
                impersonation, fraud, abuse, or legal risk.
              </p>
              <p>
                By using the service, you agree to follow the live namespace and
                verification rules published in the product and in the name
                policy.
              </p>
              <p>
                Where a user signs an ENS text-record transaction, that onchain
                publication becomes part of the user’s public identity surface
                and may be read by compatible apps, wallets, or indexers.
              </p>
            </>
          ),
        },
        {
          title: "2. Eligibility and identity",
          body: (
            <>
              <p>
                You must provide accurate onboarding information and you may be
                asked to complete phone, bank, BVN, wallet, social, business, or
                other verification steps depending on the product surface you
                use.
              </p>
              <p>
                NairaTag may suspend, limit, or reject account activity where
                identity signals are inconsistent, unverifiable, deceptive, or
                linked to regulated or restricted namespaces.
              </p>
            </>
          ),
        },
        {
          title: "3. Handle claims and namespace controls",
          body: (
            <>
              <p>
                A claim does not override namespace policy. Public names may be
                claimable, premium names may require paid or managed release,
                protected names require manual approval, and blocked names are
                not available publicly.
              </p>
              <p>
                Governments, regulators, financial institutions, brands,
                religious or cultural titles, and other sensitive identifiers may
                be reserved, reviewed, or reassigned in line with safety,
                trademark, public-interest, or impersonation controls.
              </p>
            </>
          ),
        },
        {
          title: "4. Marketplace and pricing",
          body: (
            <>
              <p>
                Only eligible names may be listed in the public marketplace.
                Protected names are not public sale inventory. NairaTag may
                reject listings, pause transfers, or require review before a
                handle transfer completes.
              </p>
              <p>
                Premium pricing, commissions, release schedules, and eligibility
                rules may change over time. Completed marketplace actions may be
                logged for audit, compliance, and dispute handling.
              </p>
            </>
          ),
        },
        {
          title: "5. Prohibited conduct",
          body: (
            <ul className="list-disc space-y-2 pl-5">
              <li>Do not impersonate public offices, institutions, brands, or other people.</li>
              <li>Do not use NairaTag for fraud, sanctions evasion, scams, or illegal payments.</li>
              <li>Do not misuse the API, marketplace, or claim system to squat on sensitive names.</li>
              <li>Do not submit false verification documents or misleading trust signals.</li>
            </ul>
          ),
        },
        {
          title: "6. Enforcement and changes",
          body: (
            <>
              <p>
                We may review, suspend, reclaim, relabel, or disable handles and
                related product actions where safety, compliance, or legal review
                requires it. We may also update these terms as the platform and
                regulations evolve.
              </p>
              <p>
                Continued use of the service after changes means you accept the
                updated terms.
              </p>
            </>
          ),
        },
      ]}
    />
  );
}
