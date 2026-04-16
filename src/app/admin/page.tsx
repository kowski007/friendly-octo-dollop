import { Container, SectionHeader } from "@/components/nairatag/ui";
import { AdminDashboard } from "@/components/admin/AdminDashboard";

export const dynamic = "force-dynamic";

export default function AdminPage() {
  return (
    <Container>
      <SectionHeader
        eyebrow="Admin overview"
        title="Monitor claims and API usage."
        description="Track claimed handles, resolve traffic, success rate, and latency in one place."
      />
      <div className="mt-10">
        <AdminDashboard />
      </div>
    </Container>
  );
}

