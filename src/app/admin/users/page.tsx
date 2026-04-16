import { Container, SectionHeader } from "@/components/nairatag/ui";
import { AdminUsers } from "@/components/admin/AdminUsers";

export const dynamic = "force-dynamic";

export default function AdminUsersPage() {
  return (
    <Container>
      <SectionHeader
        eyebrow="Users"
        title="Phone-verified identities (Phase 0)."
        description="Track phone verification, BVN linking status, and when users claimed handles."
      />
      <div className="mt-10">
        <AdminUsers />
      </div>
    </Container>
  );
}

