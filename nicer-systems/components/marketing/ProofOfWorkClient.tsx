"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { track, EVENTS } from "@/lib/analytics";
import { ScrollReveal } from "./ScrollReveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Badge } from "@/components/ui/Badge";
import { GlassCard } from "@/components/ui/GlassCard";
import type { CaseStudy } from "@/types/case-study";

interface ProofOfWorkClientProps {
  caseStudies: CaseStudy[];
  industries: string[];
}

export function ProofOfWorkClient({
  caseStudies,
  industries,
}: ProofOfWorkClientProps) {
  const [activeFilter, setActiveFilter] = useState("All");

  const filtered =
    activeFilter === "All"
      ? caseStudies
      : caseStudies.filter((cs) => cs.industry === activeFilter);

  return (
    <section className="py-24">
      <div className="max-w-6xl mx-auto px-6">
        <ScrollReveal>
          <SectionHeading
            eyebrow="Results"
            title="Proof of Work"
            description="Real results from real operations teams."
          />
        </ScrollReveal>

        {/* Filter chips */}
        <ScrollReveal delay={0.1}>
          <div className="flex flex-wrap justify-center gap-2 mb-12">
            {["All", ...industries].map((industry) => (
              <button
                key={industry}
                onClick={() => {
                  setActiveFilter(industry);
                  if (industry !== "All") {
                    track(EVENTS.PROOF_GALLERY_FILTER, { industry });
                  }
                }}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  activeFilter === industry
                    ? "bg-primary text-background shadow-[var(--glow-sm)]"
                    : "bg-glass-bg backdrop-blur-sm border border-glass-border text-muted hover:text-foreground hover:border-primary/30"
                }`}
              >
                {industry}
              </button>
            ))}
          </div>
        </ScrollReveal>

        {/* Cards grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((cs, i) => (
            <ScrollReveal key={cs.id} delay={i * 0.1}>
              <Link
                href={`/case-studies/${cs.slug}`}
                onClick={() =>
                  track(EVENTS.CASE_STUDY_VIEW, {
                    slug: cs.slug,
                    title: cs.title,
                  })
                }
              >
                <GlassCard hover className="group overflow-hidden">
                  {/* Thumbnail */}
                  <div className="h-40 rounded-t-xl bg-surface-light/50 flex items-center justify-center overflow-hidden">
                    {cs.thumbnail_url ? (
                      <Image
                        src={cs.thumbnail_url}
                        alt={cs.title}
                        width={800}
                        height={320}
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-primary/20 text-4xl font-bold text-glow">
                        {cs.industry.charAt(0)}
                      </div>
                    )}
                  </div>

                  <div className="p-5">
                    {/* Tags */}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      <Badge variant="primary">{cs.industry}</Badge>
                      {cs.tools.slice(0, 2).map((tool) => (
                        <Badge key={tool} variant="muted">{tool}</Badge>
                      ))}
                    </div>

                    <h3 className="font-semibold mb-2 group-hover:text-primary group-hover:text-glow transition-all">
                      {cs.title}
                    </h3>
                    <p className="text-sm text-muted line-clamp-2 leading-relaxed">
                      {cs.challenge}
                    </p>

                    {/* Metrics */}
                    {cs.metrics.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-glass-border">
                        {cs.metrics.slice(0, 1).map((m) => (
                          <div
                            key={m.label}
                            className="flex items-center gap-2 text-xs"
                          >
                            <span className="text-muted">{m.label}:</span>
                            <span className="text-red-400 line-through">
                              {m.before}
                            </span>
                            <span className="text-primary font-medium text-glow">
                              {m.after}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </GlassCard>
              </Link>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal delay={0.3} className="text-center mt-8">
          <Link
            href="/case-studies"
            className="inline-block text-primary hover:text-glow hover:underline transition-all"
          >
            View all case studies &rarr;
          </Link>
        </ScrollReveal>
      </div>
    </section>
  );
}
