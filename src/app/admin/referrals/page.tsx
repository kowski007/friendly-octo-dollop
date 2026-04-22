import { Container, SectionHeader } from "@/components/nairatag/ui";
import { AdminReferrals } from "@/components/admin/AdminReferrals";

export const dynamic = "force-dynamic";

export default function AdminReferralsPage() {
  return (
    <Container>
      <SectionHeader
        eyebrow="Referrals"
        title="Track invite growth and conversions."
        description="Referrals are attributed at sign-in. Conversions happen when the referred user claims a handle."
      />
      <div className="mt-10">
        <AdminReferrals />
      </div>
    </Container>
  );
}
