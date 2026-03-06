import { BrushRevealHero } from "@/components/marketing/BrushRevealHero";
import { SeeItWork } from "@/components/marketing/SeeItWork";
import { ProofOfWork } from "@/components/marketing/ProofOfWork";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { PricingSection } from "@/components/marketing/PricingSection";
import { FAQSection } from "@/components/marketing/FAQSection";
import { FinalCTA } from "@/components/marketing/FinalCTA";
import { WorkflowGraph } from "@/components/marketing/WorkflowGraph";
import { LandingViewTracker } from "@/components/marketing/LandingViewTracker";
import { GlowLine } from "@/components/ui/GlowLine";

export default function LandingPage() {
  return (
    <>
      <LandingViewTracker />
      <BrushRevealHero />

      <div className="relative">
        <WorkflowGraph />
        <GlowLine />
        <SeeItWork />
        <GlowLine />
        <ProofOfWork />
        <GlowLine />
        <HowItWorks />
        <GlowLine />
        <PricingSection />
        <GlowLine />
        <FAQSection />
      </div>

      <FinalCTA />
    </>
  );
}
