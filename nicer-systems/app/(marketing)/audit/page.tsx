import type { Metadata } from "next";
import { GuidedAuditWizard } from "@/components/marketing/GuidedAuditWizard";
import { LandingViewTracker } from "@/components/marketing/LandingViewTracker";

export const metadata: Metadata = {
  title: "Guided Audit | Nicer Systems",
  description:
    "Run a structured workflow audit to turn an operational bottleneck into a concrete preview plan.",
};

export default function GuidedAuditPage() {
  return (
    <section className="border-b border-[#d8d1c4] bg-[#f4efe5] py-20 md:py-24">
      <LandingViewTracker landingPath="/audit" />
      <div className="mx-auto max-w-6xl px-6">
        <GuidedAuditWizard />
      </div>
    </section>
  );
}
