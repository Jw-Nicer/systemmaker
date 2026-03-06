import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getCaseStudyBySlug, getRelatedCaseStudies, getPublishedCaseStudies } from "@/lib/firestore/case-studies";
import { Badge } from "@/components/ui/Badge";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlowLine } from "@/components/ui/GlowLine";

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
          <h1 className="text-4xl font-bold mb-3 text-glow">{cs.title}</h1>
          {cs.client_name && (
            <p className="text-muted">{cs.client_name}</p>
          )}
        </div>

        {/* Thumbnail */}
        {cs.thumbnail_url && (
          <div className="rounded-xl overflow-hidden border border-glass-border mb-12">
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
        <div className="mb-10 border-l-2 border-l-primary pl-6">
          <h2 className="text-xl font-semibold mb-3 text-primary text-glow">The Challenge</h2>
          <p className="text-muted leading-relaxed">{cs.challenge}</p>
        </div>

        {/* Solution */}
        {cs.solution && (
          <div className="mb-10 border-l-2 border-l-primary pl-6">
            <h2 className="text-xl font-semibold mb-3 text-primary text-glow">The Solution</h2>
            <p className="text-muted leading-relaxed">{cs.solution}</p>
          </div>
        )}

        {/* Metrics Before/After */}
        {cs.metrics.length > 0 && (
          <div className="mb-10">
            <h2 className="text-xl font-semibold mb-4 text-primary text-glow border-l-2 border-l-primary pl-6">Results</h2>
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
                      <p className="text-lg font-semibold text-primary text-glow">{m.after}</p>
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
            <h2 className="text-xl font-semibold mb-4 text-primary text-glow border-l-2 border-l-primary pl-6">Tools Used</h2>
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
                        className="w-full h-32 object-cover rounded-lg mb-3"
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

        <GlowLine className="mb-12" />

        {/* CTA */}
        <GlassCard className="p-8 text-center gradient-border gradient-border-active relative overflow-hidden">
          {/* Radial glow bg */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "radial-gradient(ellipse at center, rgba(0, 212, 255, 0.04) 0%, transparent 70%)",
            }}
            aria-hidden="true"
          />
          <div className="relative z-[1]">
            <h3 className="text-xl font-bold mb-2 text-glow">
              Ready to get results like these?
            </h3>
            <p className="text-muted mb-6 max-w-lg mx-auto">
              Tell us the problem. We&apos;ll build the system.
            </p>
            <Link
              href="/contact"
              className="inline-block px-6 py-3 rounded-lg bg-primary text-background font-medium hover:shadow-[var(--glow-md)] active:scale-[0.97] transition-all"
            >
              Book a Scoping Call
            </Link>
          </div>
        </GlassCard>
      </div>
    </section>
  );
}
