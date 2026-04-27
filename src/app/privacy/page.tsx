import { LegalPage } from "@/components/nairatag/LegalPage";

export const dynamic = "force-static";

const updatedAt = "April 26, 2026";

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Privacy"
      title="Privacy Policy"
      description="This policy explains the identity, payment, marketplace, analytics, and verification data NairaTag collects and why it is used."
      updatedAt={updatedAt}
      sections={[
        {
          title: "1. Data we collect",
          body: (
            <>
              <p>
                Depending on the product surface, NairaTag may collect phone
                numbers, OTP events, claimed handles, bank-linking metadata,
                verification state, wallet addresses, social-link records,
                Telegram-bot interaction metadata, payment or marketplace
                activity, referral activity, API logs, device metadata, and
                support or review notes.
              </p>
              <p>
                We intentionally limit what appears on public profile surfaces.
                Sensitive values such as full BVN, raw bank account numbers, and
                private transaction histories are not meant for public display.
              </p>
            </>
          ),
        },
        {
          title: "2. Why we use it",
          body: (
            <ul className="list-disc space-y-2 pl-5">
              <li>To create and secure handle claims.</li>
              <li>To verify identity and payout destinations.</li>
              <li>To reduce impersonation, wrong transfers, fraud, and abuse.</li>
              <li>To operate payments, marketplace review, referrals, and notifications.</li>
              <li>To analyze reliability, product performance, and policy enforcement.</li>
            </ul>
          ),
        },
        {
          title: "3. Sharing and processors",
          body: (
            <>
              <p>
                NairaTag may use regulated infrastructure and service providers
                to support verification, hosting, messaging, payments,
                marketplace review, analytics, and identity operations. Public
                profile surfaces may expose limited trust signals and approved
                social or ENS-linked metadata.
              </p>
              <p>
                If you explicitly publish a public alias like Telegram to an
                ENS text record, that record is public onchain by design and
                should be treated as public identity metadata rather than
                private account data.
              </p>
              <p>
                We do not treat reserved-name review, verification, or payment
                integrity data as open marketing data. It is used to operate and
                defend the product safely.
              </p>
            </>
          ),
        },
        {
          title: "4. Security, retention, and review",
          body: (
            <>
              <p>
                We apply access controls, audit logging, classification rules,
                and storage-layer protections appropriate to the product stage.
                Data may be retained for security, payment operations, dispute
                review, legal compliance, and fraud prevention.
              </p>
              <p>
                We may preserve evidence linked to impersonation claims,
                marketplace disputes, verification abuse, or legal requests.
              </p>
            </>
          ),
        },
        {
          title: "5. Your controls",
          body: (
            <>
              <p>
                You can update certain profile, wallet, pay link, and social
                settings in-product. Some records may remain retained where
                required for audit, security, fraud prevention, or legal review.
              </p>
              <p>
                Reserved-name and enforcement decisions may require manual review
                rather than automatic self-service changes.
              </p>
            </>
          ),
        },
      ]}
    />
  );
}
