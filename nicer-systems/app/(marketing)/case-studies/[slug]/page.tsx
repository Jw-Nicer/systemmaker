import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getCaseStudyBySlug, getRelatedCaseStudies, getPublishedCaseStudies } from "@/lib/firestore/case-studies";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function CaseStudyDetailPage({ params }: Props) {
  const { slug } = await params;
  const [cs, allStudies] = await Promise.all([
    getCaseStudyBySlug(slug),
    getPublishedCaseStudies(),
  ]);

  if (!cs) notFound();

  const related = getRelatedCaseStudies(cs, allStudies);

  return (
    <section className="py-24">
      <div className="max-w-4xl mx-auto px-6">
        {/* Breadcrumb */}
        <nav className="mb-8 text-sm text-muted">
          <Link href="/case-studies" className="hover:text-foreground transition-colors">
            Proof of Work
          </Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">{cs.title}</span>
        </nav>

        {/* Header */}
        <div className="mb-12">
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="text-xs px-3 py-1 rounded-full bg-primary/10 text-primary font-medium">
              {cs.industry}
            </span>
            {cs.tools.map((tool) => (
              <span
                key={tool}
                className="text-xs px-3 py-1 rounded-full bg-surface-light text-muted"
              >
                {tool}
              </span>
            ))}
          </div>
          <h1 className="text-4xl font-bold mb-3">{cs.title}</h1>
          {cs.client_name && (
            <p className="text-muted">{cs.client_name}</p>
          )}
        </div>

        {/* Thumbnail */}
        {cs.thumbnail_url && (
          <div className="rounded-xl overflow-hidden border border-border mb-12">
            <Image
              src={cs.thumbnail_url}
              alt={cs.title}
              width={1200}
              height={400}
              sizes="(max-width: 1024px) 100vw, 1024px"
              className="w-full h-64 object-cover"
            />
          </div>
        )}

        {/* Challenge */}
        <div className="mb-10">
          <h2 className="text-xl font-semibold mb-3 text-primary">The Challenge</h2>
          <p className="text-muted leading-relaxed">{cs.challenge}</p>
        </div>

        {/* Solution */}
        {cs.solution && (
          <div className="mb-10">
            <h2 className="text-xl font-semibold mb-3 text-primary">The Solution</h2>
            <p className="text-muted leading-relaxed">{cs.solution}</p>
          </div>
        )}

        {/* Metrics Before/After */}
        {cs.metrics.length > 0 && (
          <div className="mb-10">
            <h2 className="text-xl font-semibold mb-4 text-primary">Results</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {cs.metrics.map((m) => (
                <div
                  key={m.label}
                  className="rounded-xl border border-border bg-surface p-5"
                >
                  <p className="text-sm text-muted mb-3 font-medium">{m.label}</p>
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="text-xs text-muted uppercase mb-0.5">Before</p>
                      <p className="text-lg font-semibold text-red-400 line-through">
                        {m.before}
                      </p>
                    </div>
                    <svg
                      className="w-5 h-5 text-muted shrink-0"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                    <div>
                      <p className="text-xs text-muted uppercase mb-0.5">After</p>
                      <p className="text-lg font-semibold text-primary">{m.after}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tools Used */}
        {cs.tools.length > 0 && (
          <div className="mb-12">
            <h2 className="text-xl font-semibold mb-4 text-primary">Tools Used</h2>
            <div className="flex flex-wrap gap-2">
              {cs.tools.map((tool) => (
                <span
                  key={tool}
                  className="px-4 py-2 rounded-lg border border-border bg-surface text-sm"
                >
                  {tool}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Related Case Studies */}
        {related.length > 0 && (
          <div className="mb-12">
            <h2 className="text-xl font-semibold mb-4">Related Case Studies</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {related.map((r) => (
                <Link
                  key={r.id}
                  href={`/case-studies/${r.slug}`}
                  className="rounded-xl border border-border bg-surface p-5 hover:border-primary/40 transition-colors"
                >
                  {r.thumbnail_url && (
                    <Image
                      src={r.thumbnail_url}
                      alt={r.title}
                      width={480}
                      height={256}
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="w-full h-32 object-cover rounded-lg mb-3"
                    />
                  )}
                  <span className="text-xs text-primary font-medium">{r.industry}</span>
                  <h3 className="font-semibold mt-1 line-clamp-2">{r.title}</h3>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="rounded-xl border border-primary/30 bg-surface p-8 text-center">
          <h3 className="text-xl font-bold mb-2">
            Ready to get results like these?
          </h3>
          <p className="text-muted mb-6 max-w-lg mx-auto">
            Tell us the problem. We&apos;ll build the system.
          </p>
          <Link
            href="/contact"
            className="inline-block px-6 py-3 rounded-lg bg-primary text-background font-medium hover:opacity-90 transition-opacity"
          >
            Book a Scoping Call
          </Link>
        </div>
      </div>
    </section>
  );
}
