import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import {
  getRelatedCaseStudies,
  getResolvedCaseStudyBySlug,
  getResolvedPublicCaseStudies,
} from "@/lib/firestore/case-studies";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const cs = await getResolvedCaseStudyBySlug(slug);
  if (!cs) return { title: "Case Study Not Found | Nicer Systems" };

  const title = `${cs.title} | Nicer Systems`;
  const description = cs.challenge?.slice(0, 160) || `${cs.industry} automation case study`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      siteName: "Nicer Systems",
      ...(cs.thumbnail_url && { images: [{ url: cs.thumbnail_url, width: 1200, height: 630 }] }),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(cs.thumbnail_url && { images: [cs.thumbnail_url] }),
    },
  };
}

export default async function CaseStudyDetailPage({ params }: Props) {
  const { slug } = await params;
  const [cs, allStudies] = await Promise.all([
    getResolvedCaseStudyBySlug(slug),
    getResolvedPublicCaseStudies(),
  ]);

  if (!cs) notFound();

  const related = getRelatedCaseStudies(cs, allStudies);

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://www.nicersystems.com" },
      { "@type": "ListItem", position: 2, name: "Case Studies", item: "https://www.nicersystems.com/case-studies" },
      { "@type": "ListItem", position: 3, name: cs.title },
    ],
  };

  return (
    <section className="py-16 sm:py-24 bg-[radial-gradient(ellipse_at_top,rgba(212,221,205,0.3),transparent_60%)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Eyebrow + Breadcrumb */}
        <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-muted)] sm:tracking-[0.3em] mb-3">
          Case Study
        </p>
        <nav className="mb-8 text-sm text-[var(--text-muted)]">
          <Link href="/case-studies" className="hover:text-[var(--text-heading)] transition-colors">
            Case Studies
          </Link>
          <span className="mx-2">/</span>
          <span className="text-[var(--text-heading)]">{cs.title}</span>
        </nav>

        {/* Header */}
        <div className="mb-12">
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="px-2.5 py-0.5 rounded-full bg-[var(--tag-green)] text-xs uppercase tracking-[0.10em] text-[var(--text-accent)] font-medium border border-[var(--tag-green-border)]">
              {cs.industry}
            </span>
            {cs.tools.map((tool) => (
              <span
                key={tool}
                className="px-2.5 py-0.5 rounded-full bg-[var(--tag-warm)] text-xs uppercase tracking-[0.10em] text-[var(--text-muted)] border border-[var(--tag-warm-border)]"
              >
                {tool}
              </span>
            ))}
          </div>
          <h1 className="font-[var(--font-editorial)] text-3xl leading-[1.05] tracking-[-0.03em] text-[var(--text-heading)] sm:text-4xl md:text-6xl">
            {cs.title}
          </h1>
          {cs.client_name && (
            <p className="mt-2 text-[var(--text-muted)]">
              {cs.client_name}
              {cs.published_at && (
                <span className="ml-3 text-xs text-[var(--text-muted)]">
                  Published {new Date(cs.published_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                </span>
              )}
            </p>
          )}
        </div>

        {/* Thumbnail */}
        {cs.thumbnail_url && (
          <div className="rounded-[var(--radius-card)] overflow-hidden border border-[var(--border-card)] mb-12">
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
        <div className="mb-10 border-l-2 border-l-[var(--green-accent)]/40 pl-6">
          <h2 className="text-xl font-semibold mb-3 text-[var(--green-accent)]">The Challenge</h2>
          <p className="text-[var(--text-body)] leading-relaxed">{cs.challenge}</p>
        </div>

        {/* Solution */}
        {cs.solution && (
          <div className="mb-10 border-l-2 border-l-[var(--text-muted)]/40 pl-6">
            <h2 className="text-xl font-semibold mb-3 text-[var(--text-accent)]">The Solution</h2>
            <p className="text-[var(--text-body)] leading-relaxed">{cs.solution}</p>
          </div>
        )}

        {/* Metrics Before/After */}
        {cs.metrics.length > 0 && (
          <div className="mb-12">
            <h2 className="text-xl font-semibold mb-4 text-[var(--green-accent)] border-l-2 border-l-[var(--green-accent)]/40 pl-6">Results</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {cs.metrics.map((m) => (
                <div
                  key={m.label}
                  className="rounded-[var(--radius-card)] border border-[var(--border-card)] bg-[var(--cream-card)] p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(77,63,43,0.08)]"
                >
                  <p className="text-sm text-[var(--text-muted)] mb-3 font-medium">{m.label}</p>
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="text-xs text-[var(--text-muted)] uppercase mb-0.5">Before</p>
                      <p className="text-lg font-semibold text-red-500/70 line-through">
                        {m.before}
                      </p>
                    </div>
                    <svg
                      className="w-5 h-5 text-[var(--border-light)] shrink-0"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                    <div>
                      <p className="text-xs text-[var(--text-muted)] uppercase mb-0.5">After</p>
                      <p className="text-lg font-semibold text-[var(--green-accent)]">{m.after}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Related Case Studies */}
        {related.length > 0 && (
          <div className="mb-12">
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-muted)] sm:tracking-[0.3em]">
              Related
            </p>
            <h2 className="mt-3 text-xl font-semibold mb-4 text-[var(--text-heading)]">More case studies</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {related.map((r) => (
                <Link
                  key={r.id}
                  href={`/case-studies/${r.slug}`}
                  className="group block rounded-[var(--radius-card)] border border-[var(--border-card)] bg-[var(--cream-card)] overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(77,63,43,0.08)]"
                >
                  {r.thumbnail_url && (
                    <Image
                      src={r.thumbnail_url}
                      alt={r.title}
                      width={480}
                      height={256}
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="w-full h-32 object-cover"
                    />
                  )}
                  <div className="p-4">
                    <span className="px-2.5 py-0.5 rounded-full bg-[var(--tag-green)] text-xs uppercase tracking-[0.10em] text-[var(--text-accent)] font-medium">
                      {r.industry}
                    </span>
                    <h3 className="font-medium text-[var(--text-heading)] mt-2 line-clamp-2 group-hover:text-[var(--green-accent)] transition-colors duration-300">
                      {r.title}
                    </h3>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Divider */}
        <div className="my-16 flex justify-center" aria-hidden="true">
          <div className="h-px w-24 bg-gradient-to-r from-transparent via-[var(--border-light)] to-transparent" />
        </div>

        {/* CTA */}
        <div className="rounded-[var(--radius-card-lg)] bg-[var(--green-dark)] p-8 text-center overflow-hidden">
          <h3 className="text-xl font-bold mb-2 text-[var(--cream-warm)]">
            Ready to get results like these?
          </h3>
          <p className="text-[var(--border-light)] mb-6 max-w-lg mx-auto">
            Tell us the problem. We&apos;ll build the system.
          </p>
          <Link
            href="/contact"
            className="inline-block px-6 py-3 rounded-full bg-[var(--cream-warm)] text-[var(--green-dark)] font-medium hover:bg-white active:scale-[0.97] transition-all"
          >
            Book a Scoping Call
          </Link>
        </div>
      </div>
    </section>
  );
}
