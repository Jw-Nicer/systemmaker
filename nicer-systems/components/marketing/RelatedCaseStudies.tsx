import Link from "next/link";
import type { CaseStudy } from "@/types/case-study";

/**
 * Shows related case studies based on industry and tool overlap.
 * Server component — no client JS needed.
 */
export function RelatedCaseStudies({
  current,
  allCaseStudies,
}: {
  current: CaseStudy;
  allCaseStudies: CaseStudy[];
}) {
  // Score each case study by relevance
  const scored = allCaseStudies
    .filter((cs) => cs.id !== current.id)
    .map((cs) => {
      let score = 0;
      // Same industry = strong signal
      if (cs.industry.toLowerCase() === current.industry.toLowerCase()) {
        score += 3;
      }
      // Tool overlap
      const currentTools = new Set(current.tools.map((t) => t.toLowerCase()));
      for (const tool of cs.tools) {
        if (currentTools.has(tool.toLowerCase())) score += 1;
      }
      return { cs, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  if (scored.length === 0) return null;

  return (
    <section className="py-16">
      <div className="max-w-4xl mx-auto px-6">
        <h2 className="text-xl font-bold mb-6">Related Case Studies</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {scored.map(({ cs }) => (
            <Link
              key={cs.id}
              href={`/case-studies/${cs.slug}`}
              className="group rounded-xl border border-border bg-surface p-5 hover:border-primary/50 transition-colors"
            >
              <div className="flex flex-wrap gap-1.5 mb-3">
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                  {cs.industry}
                </span>
              </div>
              <h3 className="font-semibold text-sm mb-2 group-hover:text-primary transition-colors">
                {cs.title}
              </h3>
              <p className="text-xs text-muted line-clamp-2">{cs.challenge}</p>
              {cs.metrics.length > 0 && (
                <div className="mt-3 text-xs">
                  <span className="text-muted">{cs.metrics[0].label}: </span>
                  <span className="text-red-400 line-through">
                    {cs.metrics[0].before}
                  </span>
                  <span className="text-muted"> → </span>
                  <span className="text-primary font-medium">
                    {cs.metrics[0].after}
                  </span>
                </div>
              )}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
