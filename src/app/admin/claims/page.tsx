import { Container, SectionHeader } from "@/components/nairatag/ui";
import { AdminClaims } from "@/components/admin/AdminClaims";

export const dynamic = "force-dynamic";

export default function AdminClaimsPage() {
  return (
    <Container>
      <SectionHeader
        eyebrow="Claims"
        title="Claimed handles and identities."
        description="Search claimed handles, see status, and add test claims for demo purposes."
      />
      <div className="mt-10">
        <AdminClaims />
      </div>
    </Container>
  );
}

