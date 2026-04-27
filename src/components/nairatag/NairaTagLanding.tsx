import { ClientsSection } from "./ClientsSection";
import { HeroRef } from "./HeroRef";
import { HeaderNav } from "./HeaderNav";
import { HowItWorksSection } from "./HowItWorksSection";
import { FeaturesGridSection } from "./FeaturesGridSection";
import { LiveDemoSection } from "./LiveDemoSection";
import { TrustSection } from "./TrustSection";
import { IdentityStackSection } from "./IdentityStackSection";
import { FaqSection } from "./FaqSection";
import { FinalCtaSection } from "./FinalCtaSection";
import { FooterSection } from "./FooterSection";

export function NairaTagLanding() {
  return (
    <div className="nt-landing-bg min-h-screen">
      <div id="top" className="sr-only" />
      <HeaderNav />
      <main>
        <HeroRef />
        <HowItWorksSection />
        <FeaturesGridSection />
        <LiveDemoSection />
        <TrustSection />
        <ClientsSection />
        <IdentityStackSection />
        <FaqSection />
        <FinalCtaSection />
      </main>
      <FooterSection />
    </div>
  );
}
