"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { track, EVENTS } from "@/lib/analytics";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import type { CaseStudy } from "@/types/case-study";
import { RESULT_CATEGORIES } from "@/types/case-study";

interface ProofOfWorkClientProps {
  caseStudies: CaseStudy[];
  industries: string[];
  workflowTypes?: string[];
  eyebrow?: string;
  title?: string;
  description?: string;
}

export function ProofOfWorkClient({
  caseStudies,
  industries,
  workflowTypes = [],
  eyebrow = "Results",
  title = "Case studies",
  description = "Real results from real operations teams.",
}: ProofOfWorkClientProps) {
  const [activeIndustry, setActiveIndustry] = useState("All");
  const [activeWorkflow, setActiveWorkflow] = useState("All");
  const [activeResultCat, setActiveResultCat] = useState("All");
  const reducedMotion = useReducedMotion();

  const filtered = caseStudies.filter((cs) => {
    if (activeIndustry !== "All" && cs.industry !== activeIndustry) return false;
    if (activeWorkflow !== "All" && cs.workflow_type !== activeWorkflow) return false;
    if (activeResultCat !== "All" && !(cs.result_categories ?? []).includes(activeResultCat as never)) return false;
    return true;
  });

  const springTransition = reducedMotion
    ? { duration: 0.3 }
    : { type: "spring" as const, stiffness: 80, damping: 20 };

  // Collect unique result categories present in data
  const availableResultCats = Array.from(
    new Set(caseStudies.flatMap((cs) => cs.result_categories ?? []))
  );

  return (
    <section id="proof-of-work" className="border-b border-[var(--border-light)] bg-[var(--cream-bg)] py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={springTransition}
        >
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-muted)] sm:tracking-[0.3em]">
            {eyebrow}
          </p>
          <h2 className="mt-4 font-[var(--font-editorial)] text-4xl leading-[0.96] tracking-[-0.04em] text-[var(--text-heading)] sm:text-5xl md:text-7xl">
            {title}
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--text-body)]">
            {description}
          </p>
        </motion.div>

        {/* Industry filter chips */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ ...springTransition, delay: 0.1 }}
          className="mt-8 mb-4 flex flex-wrap gap-2 sm:mt-10"
        >
          {["All", ...industries].map((industry) => (
            <button
              key={industry}
              onClick={() => {
                setActiveIndustry(industry);
                if (industry !== "All") {
                  track(EVENTS.PROOF_GALLERY_FILTER, { industry });
                }
              }}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                activeIndustry === industry
                  ? "bg-[var(--green-dark)] text-[var(--cream-warm)] shadow-[var(--shadow-card)]"
                  : "border border-[var(--green-accent)]/25 text-[var(--text-accent)] hover:border-[var(--green-accent)]/50 hover:text-[var(--text-heading)]"
              }`}
            >
              {industry}
            </button>
          ))}
        </motion.div>

        {/* Workflow type filter chips */}
        {workflowTypes.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {["All", ...workflowTypes].map((wt) => (
              <button
                key={wt}
                onClick={() => setActiveWorkflow(wt)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 ${
                  activeWorkflow === wt
                    ? "bg-[var(--text-accent)] text-[var(--cream-warm)]"
                    : "border border-[var(--border-subtle)] text-[var(--text-muted)] hover:border-[var(--text-accent)]/40 hover:text-[var(--text-body)]"
                }`}
              >
                {wt}
              </button>
            ))}
          </div>
        )}

        {/* Result category filter chips */}
        {availableResultCats.length > 0 && (
          <div className="mb-10 sm:mb-12 flex flex-wrap gap-2">
            {["All", ...availableResultCats].map((cat) => {
              const label = cat === "All" ? "All Results" : RESULT_CATEGORIES.find((rc) => rc.value === cat)?.label ?? cat;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveResultCat(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 ${
                    activeResultCat === cat
                      ? "bg-[var(--green-accent)] text-[var(--cream-warm)]"
                      : "border border-[var(--border-subtle)] text-[var(--text-muted)] hover:border-[var(--green-accent)]/40 hover:text-[var(--text-body)]"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}

        {/* Spacer when no secondary filters */}
        {workflowTypes.length === 0 && availableResultCats.length === 0 && (
          <div className="mb-6 sm:mb-8" />
        )}

        {/* Cards grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((cs, i) => (
            <motion.div
              key={cs.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ ...springTransition, delay: i * 0.08 }}
            >
              <Link
                href={`/case-studies/${cs.slug}`}
                onClick={() =>
                  track(EVENTS.CASE_STUDY_VIEW, {
                    slug: cs.slug,
                    title: cs.title,
                  })
                }
                className="group relative block rounded-[var(--radius-card)] border border-[var(--border-card)] bg-[var(--cream-card)] shadow-[var(--shadow-card)] overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-hover)]"
              >
                {/* Thumbnail */}
                <div className="h-40 bg-[linear-gradient(180deg,rgba(212,221,205,0.42),rgba(162,182,152,0.22))] flex items-center justify-center overflow-hidden">
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
                    <div className="text-[var(--text-heading)]/10 text-5xl font-[var(--font-editorial)]">
                      {cs.industry.charAt(0)}
                    </div>
                  )}
                </div>

                <div className="p-5">
                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                      <span className="px-2.5 py-0.5 rounded-full bg-[var(--tag-green)] text-xs uppercase tracking-[0.10em] text-[var(--text-accent)] font-medium">
                        {cs.industry}
                      </span>
                    {cs.tools.slice(0, 2).map((tool) => (
                      <span
                        key={tool}
                        className="px-2.5 py-0.5 rounded-full bg-[var(--tag-warm)] text-xs uppercase tracking-[0.10em] text-[var(--text-muted)]"
                      >
                        {tool}
                      </span>
                    ))}
                    {(cs.result_categories ?? []).map((cat) => {
                      const label = RESULT_CATEGORIES.find((rc) => rc.value === cat)?.label ?? cat;
                      return (
                        <span
                          key={cat}
                          className="px-2 py-0.5 rounded-full bg-[var(--green-accent)]/10 text-[10px] uppercase tracking-[0.08em] text-[var(--green-accent)] font-medium"
                        >
                          {label}
                        </span>
                      );
                    })}
                  </div>

                  <h3 className="font-medium text-[var(--text-heading)] mb-2 group-hover:text-[var(--green-accent)] transition-colors duration-300">
                    {cs.title}
                  </h3>
                  <p className="text-sm text-[var(--text-body)] line-clamp-2 leading-relaxed">
                    {cs.challenge}
                  </p>

                  {/* Metrics */}
                  {cs.metrics.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-[var(--border-subtle)]">
                      {cs.metrics.slice(0, 1).map((m) => (
                        <div
                          key={m.label}
                          className="flex items-center gap-2 text-xs"
                        >
                          <span className="text-[var(--text-muted)]">{m.label}:</span>
                          <span className="text-[var(--text-muted)] line-through decoration-[var(--border-subtle)]">
                            {m.before}
                          </span>
                          <span className="font-medium text-[var(--green-accent)]">
                            {m.after}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="text-center mt-10"
        >
          <Link
            href="/case-studies"
            className="inline-block text-sm text-[var(--text-accent)] hover:text-[var(--text-heading)] transition-colors"
          >
            View all case studies &rarr;
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
