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
    <section className="py-24">
      <div className="max-w-6xl mx-auto px-6">
        <h1 className="text-4xl font-bold mb-4">Proof of Work</h1>
        <p className="text-muted mb-12">
          Real implementations. Real metrics. Real outcomes.
        </p>

        {/* Filter chips */}
        <div className="flex flex-wrap gap-2 mb-8">
          {["All", ...industries].map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeFilter === filter
                  ? "bg-primary text-background"
                  : "border border-border text-muted hover:border-primary hover:text-primary"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-24 text-muted">
            No case studies published yet. Check back soon.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((cs) => (
              <Link
                key={cs.id}
                href={`/case-studies/${cs.slug}`}
                className="block rounded-xl border border-border bg-surface hover:border-primary/40 transition-colors group"
              >
                {/* Thumbnail */}
                <div className="h-40 rounded-t-xl bg-surface-light flex items-center justify-center overflow-hidden">
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
                    <div className="text-muted/30 text-4xl font-bold">
                      {cs.industry.charAt(0)}
                    </div>
                  )}
                </div>

                <div className="p-5">
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
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
