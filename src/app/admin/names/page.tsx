import { AdminNameIndex } from "@/components/admin/AdminNameIndex";
import { Container, SectionHeader } from "@/components/nairatag/ui";

export const dynamic = "force-dynamic";

export default function AdminNamesPage() {
  return (
    <Container>
      <SectionHeader
        eyebrow="Name index"
        title="Manage premium, reserved, and blocked handles."
        description="Control namespace policy separately from ownership, then push live rule changes across claim, marketplace, and bot flows."
      />
      <div className="mt-10">
        <AdminNameIndex />
      </div>
    </Container>
  );
}
