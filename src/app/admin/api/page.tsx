import { Container, SectionHeader } from "@/components/nairatag/ui";
import { AdminApiUsage } from "@/components/admin/AdminApiUsage";

export const dynamic = "force-dynamic";

export default function AdminApiPage() {
  return (
    <Container>
      <SectionHeader
        eyebrow="API usage"
        title="Resolve traffic, status, and latency."
        description="Recent API calls captured from /api/resolve and /api/claim."
      />
      <div className="mt-10">
        <AdminApiUsage />
      </div>
    </Container>
  );
}

