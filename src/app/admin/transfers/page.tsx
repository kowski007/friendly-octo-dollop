import { Container, SectionHeader } from "@/components/nairatag/ui";
import { AdminMarketplaceTransfers } from "@/components/admin/AdminMarketplaceTransfers";

export const dynamic = "force-dynamic";

export default function AdminTransfersPage() {
  return (
    <Container>
      <SectionHeader
        eyebrow="Marketplace review"
        title="Approve or reject handle transfers."
        description="Accepted offers enter review before ownership changes. Approvals require a verified buyer with a payout destination linked."
      />
      <div className="mt-10">
        <AdminMarketplaceTransfers />
      </div>
    </Container>
  );
}
