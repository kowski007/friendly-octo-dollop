import { LegalPage } from "@/components/nairatag/LegalPage";

export const dynamic = "force-static";

const updatedAt = "April 26, 2026";

export default function NamePolicyPage() {
  return (
    <LegalPage
      eyebrow="Policy"
      title="Name Index and Reserved Names Policy"
      description="The Name Index controls what a handle may be, while the claim system controls who owns it. This policy explains the difference and the approval rules."
      updatedAt={updatedAt}
      sections={[
        {
          title: "1. The four name states",
          body: (
            <ul className="list-disc space-y-2 pl-5">
              <li><strong>Public:</strong> free to claim if not already owned.</li>
              <li><strong>Premium:</strong> managed paid inventory, not directly claimable.</li>
              <li><strong>Protected:</strong> reserved for reviewed entities or sensitive identities.</li>
              <li><strong>Blocked:</strong> never available publicly.</li>
            </ul>
          ),
        },
        {
          title: "2. Why names are protected",
          body: (
            <>
              <p>
                Names may be protected where open public claiming would create a
                high impersonation, fraud, trademark, public-interest, religious,
                cultural, or regulatory risk. This includes state institutions,
                financial institutions, brands, official titles, public offices,
                and sensitive public or faith-linked terms.
              </p>
              <p>
                Examples include names like CBN, Nigeria, presidency, church,
                islam, pastor, imam, mosque, bishop, emir, and other protected
                government or cultural identifiers.
              </p>
            </>
          ),
        },
        {
          title: "3. How protected-name access works",
          body: (
            <>
              <p>
                Protected names are not self-serve claims and are not sold as
                marketplace inventory. Access is reviewed manually by NairaTag.
              </p>
              <ul className="list-disc space-y-2 pl-5">
                <li>Governments and public institutions may be asked for official domains, letters, or delegated authority.</li>
                <li>Brands may be asked for CAC records, trademark evidence, or corporate authorization.</li>
                <li>Religious, cultural, and public titles may require identity, governance, or community legitimacy review.</li>
                <li>Approved entities may still need phone, bank, BVN, business, wallet, or additional verification before activation.</li>
              </ul>
            </>
          ),
        },
        {
          title: "4. Marketplace and premium rules",
          body: (
            <>
              <p>
                Premium names may be offered under managed release or pricing
                rules. Protected names are not premium inventory. Blocked names
                are not offered publicly.
              </p>
              <p>
                NairaTag may pause, reclassify, delist, or reject a listing or
                transfer if a name carries policy, impersonation, or legal risk.
              </p>
            </>
          ),
        },
        {
          title: "5. Disputes, reassignment, and enforcement",
          body: (
            <>
              <p>
                We may freeze, review, relabel, reclaim, or reassign names where
                safety, legal rights, public-interest concerns, or verified
                impersonation complaints require it. A public claim does not
                override a protected-name decision.
              </p>
              <p>
                The Name Index may evolve as new fraud patterns, regulatory
                requirements, or legitimate entity requests emerge.
              </p>
            </>
          ),
        },
      ]}
    />
  );
}
