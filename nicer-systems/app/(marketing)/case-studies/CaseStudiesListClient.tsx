"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { track, EVENTS } from "@/lib/analytics";
import type { CaseStudy, ResultCategory } from "@/types/case-study";
import { RESULT_CATEGORIES } from "@/types/case-study";
import {
  matchesCaseStudyFilters,
  collectResultCategories,
} from "@/lib/marketing/case-study-filters";

interface Props {
  caseStudies: CaseStudy[];
  industries: string[];
  workflowTypes?: string[];
}

export function CaseStudiesListClient({
  caseStudies,
  industries,
  workflowTypes = [],
}: Props) {
  const [activeIndustry, setActiveIndustry] = useState("All");
  const [activeWorkflow, setActiveWorkflow] = useState("All");
  const [activeResultCat, setActiveResultCat] = useState<ResultCategory | "All">(
    "All"
  );

  // Collect unique result categories present in the data. Client-side
  // derivation (same as ProofOfWorkClient) so the chip set reflects what
  // actually exists instead of the full static taxonomy.
  const availableResultCats = useMemo(
    () => collectResultCategories(caseStudies),
    [caseStudies]
  );

  const filtered = caseStudies.filter((cs) =>
    matchesCaseStudyFilters(cs, {
      industry: activeIndustry,
      workflowType: activeWorkflow,
      resultCategory: activeResultCat,
    })
  );

  const resetFilters = () => {
    setActiveIndustry("All");
    setActiveWorkflow("All");
    setActiveResultCat("All");
  };

  return (
    <section className="border-b border-[var(--border-light)] py-16 sm:py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-muted)] sm:tracking-[0.3em]">
          Proof of work
        </p>
        <h1 className="mt-4 font-[var(--font-editorial)] text-4xl leading-[0.96] tracking-[-0.04em] text-[var(--text-heading)] sm:text-5xl md:text-7xl">
          Case Studies
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--text-body)]">
          Real implementations. Real metrics. Real outcomes.
        </p>

        {caseStudies.length > 0 && (
          <>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              {caseStudies.length} case{" "}
              {caseStudies.length === 1 ? "study" : "studies"}
            </p>

            {/* Industry filter chips (primary) */}
            <div className="flex flex-wrap gap-2 mt-8 mb-4 sm:mt-10">
              {["All", ...industries].map((filter) => (
                <button
                  key={filter}
                  onClick={() => {
                    setActiveIndustry(filter);
                    if (filter !== "All") {
                      track(EVENTS.PROOF_GALLERY_FILTER, {
                        industry: filter,
                        source: "case_studies_list",
                      });
                    }
                  }}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                    activeIndustry === filter
                      ? "bg-[var(--green-dark)] text-[var(--cream-warm)] shadow-[var(--shadow-card)]"
                      : "border border-[var(--green-accent)]/25 text-[var(--text-accent)] hover:border-[var(--green-accent)]/50 hover:text-[var(--text-heading)]"
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>

            {/* Workflow type filter chips (secondary) */}
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

            {/* Result category filter chips (tertiary) */}
            {availableResultCats.length > 0 && (
              <div className="mb-10 sm:mb-12 flex flex-wrap gap-2">
                {(["All", ...availableResultCats] as (ResultCategory | "All")[]).map(
                  (cat) => {
                    const label =
                      cat === "All"
                        ? "All Results"
                        : RESULT_CATEGORIES.find((rc) => rc.value === cat)
                            ?.label ?? cat;
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
                  }
                )}
              </div>
            )}
          </>
        )}

        {caseStudies.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-lg font-medium text-[var(--text-heading)]">
              Case studies coming soon
            </p>
            <p className="mt-2 text-sm text-[var(--text-muted)] max-w-md mx-auto">
              We&apos;re documenting real automation results. In the meantime,
              see what a preview plan looks like for your business.
            </p>
            <Link
              href="/#see-it-work"
              className="mt-6 inline-block rounded-full bg-[var(--green-dark)] px-6 py-2.5 text-sm font-medium text-[var(--cream-warm)] shadow-[var(--shadow-card)] transition-all duration-300 hover:scale-[1.02] hover:shadow-[var(--shadow-card-hover)]"
            >
              See a live preview plan
            </Link>
            <div className="mt-6">
              <Link
                href="/"
                className="text-sm text-[var(--text-accent)] hover:text-[var(--text-heading)] transition-colors"
              >
                &larr; Back to homepage
              </Link>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24 text-[var(--text-muted)]">
            <p>No case studies match this filter.</p>
            <button
              onClick={resetFilters}
              className="mt-4 text-sm text-[var(--text-accent)] hover:text-[var(--text-heading)] underline underline-offset-4 transition-colors"
            >
              Reset filters
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((cs) => (
              <Link
                key={cs.id}
                href={`/case-studies/${cs.slug}`}
                onClick={() =>
                  track(EVENTS.CASE_STUDY_VIEW, {
                    slug: cs.slug,
                    title: cs.title,
                    source: "case_studies_list",
                  })
                }
                className="group block rounded-[var(--radius-card)] border border-[var(--border-card)] bg-[var(--cream-card)] shadow-[var(--shadow-card)] overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-hover)]"
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
                    {cs.workflow_type && (
                      <span className="px-2.5 py-0.5 rounded-full bg-[var(--tag-warm)] text-xs uppercase tracking-[0.10em] text-[var(--text-muted)]">
                        {cs.workflow_type}
                      </span>
                    )}
                    {cs.tools.slice(0, 2).map((tool) => (
                      <span
                        key={tool}
                        className="px-2.5 py-0.5 rounded-full bg-[var(--tag-warm)] text-xs uppercase tracking-[0.10em] text-[var(--text-muted)]"
                      >
                        {tool}
                      </span>
                    ))}
                    {(cs.result_categories ?? []).map((cat) => {
                      const label =
                        RESULT_CATEGORIES.find((rc) => rc.value === cat)?.label ?? cat;
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

                  {cs.metrics.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-[var(--border-subtle)]">
                      {cs.metrics.slice(0, 1).map((m) => (
                        <div
                          key={m.label}
                          className="flex items-center gap-2 text-xs"
                        >
                          <span className="text-[var(--text-muted)]">
                            {m.label}:
                          </span>
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
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
