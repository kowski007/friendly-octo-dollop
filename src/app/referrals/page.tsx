import { AppPageHeader } from "@/components/nairatag/AppPageHeader";
import { ReferralsView } from "@/components/nairatag/ReferralsView";

export const dynamic = "force-dynamic";

export default function ReferralsPage() {
  return (
    <div className="min-h-screen bg-white text-zinc-950 transition-colors dark:bg-zinc-950 dark:text-zinc-50">
      <AppPageHeader ctaHref="/agent" ctaLabel="Claim a handle" />
      <main className="py-14 sm:py-18">
        <ReferralsView />
      </main>
    </div>
  );
}
