"use client";

import { useState } from "react";
import Link from "next/link";
import { track, EVENTS } from "@/lib/analytics";
import { ScrollReveal } from "./ScrollReveal";
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
          <h2 className="text-3xl font-bold text-center mb-4">Proof of Work</h2>
          <p className="text-muted text-center mb-8">
            Real results from real operations teams.
          </p>
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
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  activeFilter === industry
                    ? "bg-primary text-background"
                    : "bg-surface-light text-muted hover:text-foreground border border-border"
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
                className="block rounded-xl border border-border bg-surface hover:border-primary/40 transition-colors group"
              >
                {/* Thumbnail */}
                <div className="h-40 rounded-t-xl bg-surface-light flex items-center justify-center overflow-hidden">
                  {cs.thumbnail_url ? (
                    <img
                      src={cs.thumbnail_url}
                      alt={cs.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-muted/30 text-4xl font-bold">
                      {cs.industry.charAt(0)}
                    </div>
                  )}
                </div>

                <div className="p-5">
                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      {cs.industry}
                    </span>
                    {cs.tools.slice(0, 2).map((tool) => (
                      <span
                        key={tool}
                        className="text-xs px-2 py-0.5 rounded-full bg-surface-light text-muted"
                      >
                        {tool}
                      </span>
                    ))}
                  </div>

                  <h3 className="font-semibold mb-2 group-hover:text-primary transition-colors">
                    {cs.title}
                  </h3>
                  <p className="text-sm text-muted line-clamp-2">
                    {cs.challenge}
                  </p>

                  {/* Metrics */}
                  {cs.metrics.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border">
                      {cs.metrics.slice(0, 1).map((m) => (
                        <div
                          key={m.label}
                          className="flex items-center gap-2 text-xs"
                        >
                          <span className="text-muted">{m.label}:</span>
                          <span className="text-red-400 line-through">
                            {m.before}
                          </span>
                          <span className="text-primary font-medium">
                            {m.after}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal delay={0.3} className="text-center mt-8">
          <Link
            href="/case-studies"
            className="inline-block text-primary hover:underline"
          >
            View all case studies &rarr;
          </Link>
        </ScrollReveal>
      </div>
    </section>
  );
}
