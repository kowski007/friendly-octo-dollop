import { HeroRef } from "./HeroRef";
import { HeaderNav } from "./HeaderNav";
import { HowItWorksSection } from "./HowItWorksSection";
import { FeaturesSplitSection } from "./FeaturesSplitSection";
import { ServicesSection } from "./ServicesSection";
import { FeaturesGridSection } from "./FeaturesGridSection";
import { LiveDemoSection } from "./LiveDemoSection";
import { TrustSection } from "./TrustSection";
import { DevelopersSection } from "./DevelopersSection";
import { AboutSection } from "./AboutSection";
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
        <FeaturesSplitSection />
        <ServicesSection />
        <FeaturesGridSection />
        <LiveDemoSection />
        <TrustSection />
        <DevelopersSection />
        <AboutSection />
        <FaqSection />
        <FinalCtaSection />
      </main>
      <FooterSection />
    </div>
  );
}
