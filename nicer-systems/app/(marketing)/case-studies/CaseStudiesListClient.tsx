"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { CaseStudy } from "@/types/case-study";

interface Props {
  caseStudies: CaseStudy[];
  industries: string[];
}

export function CaseStudiesListClient({ caseStudies, industries }: Props) {
  const [activeFilter, setActiveFilter] = useState("All");

  const filtered =
    activeFilter === "All"
      ? caseStudies
      : caseStudies.filter((cs) => cs.industry === activeFilter);

  return (
    <section className="py-16 sm:py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <h1 className="font-[var(--font-editorial)] text-4xl leading-[0.96] tracking-[-0.04em] text-[var(--text-heading)] sm:text-5xl md:text-6xl">
          Case Studies
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--text-body)]">
          Real implementations. Real metrics. Real outcomes.
        </p>

        {/* Filter chips */}
        <div className="flex flex-wrap gap-2 mt-8 mb-10 sm:mt-10 sm:mb-12">
          {["All", ...industries].map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                activeFilter === filter
                  ? "bg-[var(--green-dark)] text-[var(--cream-warm)] shadow-[var(--shadow-card)]"
                  : "border border-[#3f4a37]/25 text-[var(--text-accent)] hover:border-[#3f4a37]/50 hover:text-[var(--text-heading)]"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-24 text-[var(--text-muted)]">
            No case studies published yet. Check back soon.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((cs) => (
              <Link
                key={cs.id}
                href={`/case-studies/${cs.slug}`}
                className="group block rounded-[var(--radius-card)] border border-[var(--border-card)] bg-[var(--cream-card)]/96 shadow-[var(--shadow-card)] overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-hover)]"
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
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#e7efe4] text-xs uppercase tracking-[0.10em] text-[var(--text-accent)] font-medium">
                      {cs.industry}
                    </span>
                    {cs.tools.slice(0, 2).map((tool) => (
                      <span
                        key={tool}
                        className="px-2.5 py-0.5 rounded-full bg-[#f1ebdf] text-xs uppercase tracking-[0.10em] text-[var(--text-muted)]"
                      >
                        {tool}
                      </span>
                    ))}
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
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
