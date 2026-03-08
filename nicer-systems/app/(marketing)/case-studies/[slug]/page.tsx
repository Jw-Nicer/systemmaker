import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { getCaseStudyBySlug, getRelatedCaseStudies, getPublishedCaseStudies } from "@/lib/firestore/case-studies";
import { Badge } from "@/components/ui/Badge";
import { GlassCard } from "@/components/ui/GlassCard";
import { WaveDivider } from "@/components/ui/GlowLine";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const cs = await getCaseStudyBySlug(slug);
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
    getCaseStudyBySlug(slug),
    getPublishedCaseStudies(),
  ]);

  if (!cs) notFound();

  const related = getRelatedCaseStudies(cs, allStudies);

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://nicer-systems.web.app" },
      { "@type": "ListItem", position: 2, name: "Case Studies", item: "https://nicer-systems.web.app/case-studies" },
      { "@type": "ListItem", position: 3, name: cs.title },
    ],
  };

  return (
    <section className="py-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <div className="max-w-4xl mx-auto px-6">
        {/* Breadcrumb */}
        <nav className="mb-8 text-sm text-muted">
          <Link href="/case-studies" className="hover:text-primary transition-colors">
            Proof of Work
          </Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">{cs.title}</span>
        </nav>

        {/* Header */}
        <div className="mb-12">
          <div className="flex flex-wrap gap-2 mb-4">
            <Badge variant="primary">{cs.industry}</Badge>
            {cs.tools.map((tool) => (
              <Badge key={tool} variant="muted">{tool}</Badge>
            ))}
          </div>
          <h1 className="text-4xl font-bold mb-3 text-soft-glow">{cs.title}</h1>
          {cs.client_name && (
            <p className="text-muted">{cs.client_name}</p>
          )}
        </div>

        {/* Thumbnail */}
        {cs.thumbnail_url && (
          <div className="rounded-[var(--radius-lg)] overflow-hidden border border-glass-border mb-12">
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
        <div className="mb-10 border-l-2 border-l-primary/40 pl-6">
          <h2 className="text-xl font-semibold mb-3 text-primary">The Challenge</h2>
          <p className="text-muted leading-relaxed">{cs.challenge}</p>
        </div>

        {/* Solution */}
        {cs.solution && (
          <div className="mb-10 border-l-2 border-l-secondary/40 pl-6">
            <h2 className="text-xl font-semibold mb-3 text-secondary">The Solution</h2>
            <p className="text-muted leading-relaxed">{cs.solution}</p>
          </div>
        )}

        {/* Metrics Before/After */}
        {cs.metrics.length > 0 && (
          <div className="mb-10">
            <h2 className="text-xl font-semibold mb-4 text-primary border-l-2 border-l-tertiary/40 pl-6">Results</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {cs.metrics.map((m) => (
                <GlassCard key={m.label} hover className="p-5">
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
                </GlassCard>
              ))}
            </div>
          </div>
        )}

        {/* Tools Used */}
        {cs.tools.length > 0 && (
          <div className="mb-12">
            <h2 className="text-xl font-semibold mb-4 text-primary border-l-2 border-l-primary/40 pl-6">Tools Used</h2>
            <div className="flex flex-wrap gap-2">
              {cs.tools.map((tool) => (
                <GlassCard key={tool} className="px-4 py-2 text-sm">
                  {tool}
                </GlassCard>
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
                >
                  <GlassCard hover className="p-5">
                    {r.thumbnail_url && (
                      <Image
                        src={r.thumbnail_url}
                        alt={r.title}
                        width={480}
                        height={256}
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="w-full h-32 object-cover rounded-[var(--radius-sm)] mb-3"
                      />
                    )}
                    <Badge variant="primary" className="mb-1">{r.industry}</Badge>
                    <h3 className="font-semibold mt-1 line-clamp-2">{r.title}</h3>
                  </GlassCard>
                </Link>
              ))}
            </div>
          </div>
        )}

        <WaveDivider className="mb-12" />

        {/* CTA */}
        <GlassCard hover className="p-8 text-center relative overflow-hidden">
          {/* Organic mesh bg */}
          <div className="absolute inset-0 organic-mesh pointer-events-none" aria-hidden="true" />
          <div className="relative z-[1]">
            <h3 className="text-xl font-bold mb-2 text-soft-glow">
              Ready to get results like these?
            </h3>
            <p className="text-muted mb-6 max-w-lg mx-auto">
              Tell us the problem. We&apos;ll build the system.
            </p>
            <Link
              href="/contact"
              className="inline-block px-6 py-3 rounded-full bg-gradient-to-r from-primary to-secondary text-background font-medium hover:shadow-[var(--shadow-soft-md)] active:scale-[0.97] transition-all"
            >
              Book a Scoping Call
            </Link>
          </div>
        </GlassCard>
      </div>
    </section>
  );
}
