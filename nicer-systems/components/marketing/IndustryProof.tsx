import Link from "next/link";
import type { CaseStudy } from "@/types/case-study";

export function IndustryProof({
  caseStudies,
  industryName,
}: {
  caseStudies: CaseStudy[];
  industryName: string;
}) {
  return (
    <section className="py-20 bg-surface/50">
      <div className="max-w-6xl mx-auto px-6">
        <h2 className="text-2xl font-bold mb-2 text-center">
          {industryName} Results
        </h2>
        <p className="text-muted text-center mb-10">
          Real outcomes from {industryName.toLowerCase()} operations we&apos;ve built.
        </p>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {caseStudies.map((cs) => (
            <Link
              key={cs.id}
              href={`/case-studies/${cs.slug}`}
              className="group rounded-xl border border-border bg-surface p-6 hover:border-primary/50 transition-colors"
            >
              <h3 className="font-semibold mb-2 group-hover:text-primary transition-colors">
                {cs.title}
              </h3>
              <p className="text-sm text-muted mb-4 line-clamp-2">
                {cs.challenge}
              </p>
              {cs.metrics.length > 0 && (
                <div className="flex gap-3">
                  {cs.metrics.slice(0, 2).map((m) => (
                    <div key={m.label} className="text-xs">
                      <span className="text-muted">{m.label}: </span>
                      <span className="text-red-400 line-through">{m.before}</span>
                      <span className="text-muted"> → </span>
                      <span className="text-primary font-medium">{m.after}</span>
                    </div>
                  ))}
                </div>
              )}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
