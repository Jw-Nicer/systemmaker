import { notFound } from "next/navigation";
import Link from "next/link";
import { getPlanById, incrementPlanViews } from "@/lib/firestore/plans";
import { ShareButtons } from "@/components/marketing/ShareButtons";
import { PlanWithRefine } from "./PlanWithRefine";
import { PlanViewTracker } from "./PlanViewTracker";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const plan = await getPlanById(id);

  if (!plan || !plan.is_public) {
    return { title: "Plan Not Found | Nicer Systems" };
  }

  const title = `Preview Plan: ${plan.input_summary.industry} | Nicer Systems`;
  const description = `Custom automation plan for ${plan.input_summary.industry} — ${plan.input_summary.bottleneck_summary}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      siteName: "Nicer Systems",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function PlanPage({ params }: Props) {
  const { id } = await params;
  const plan = await getPlanById(id);

  if (!plan || !plan.is_public) {
    notFound();
  }

  // Increment view count (fire-and-forget)
  incrementPlanViews(id);

  return (
    <div className="py-16">
      <div className="max-w-4xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <p className="text-sm text-primary font-medium mb-2">
            Preview Plan
          </p>
          <h1 className="text-3xl font-bold mb-3">
            {plan.input_summary.industry} Preview Plan
          </h1>
          <p className="text-muted max-w-2xl mx-auto">
            {plan.input_summary.bottleneck_summary}
          </p>
          <p className="text-xs text-muted/60 mt-4">
            Generated {new Date(plan.created_at).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
            {plan.view_count > 1 && ` · Viewed ${plan.view_count} times`}
          </p>
        </div>

        {/* Share + PDF controls */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <ShareButtons planId={id} />
        </div>

        {/* Plan content */}
        <div className="plan-printable">
          <PlanWithRefine
            plan={plan.preview_plan}
            planId={plan.id}
          />
        </div>

        {/* Disclaimer */}
        <p className="text-xs text-muted/60 italic text-center mt-8">
          This is a draft preview — not a final recommendation. Assumptions may
          not match your exact setup.
        </p>

        {/* CTA: Generate your own */}
        <div className="mt-12 rounded-xl border border-primary/30 bg-surface p-8 text-center">
          <h2 className="text-xl font-bold mb-2">
            Want a plan for your business?
          </h2>
          <p className="text-muted mb-6">
            Tell us your bottleneck and our agent will build a custom Preview
            Plan with workflow, KPI, alert, and action recommendations.
          </p>
          <Link
            href="/#see-it-work"
            className="inline-block px-8 py-3 rounded-lg bg-primary text-background font-medium hover:opacity-90 transition-opacity"
          >
            Generate Your Own Preview Plan
          </Link>
        </div>

        {/* Analytics tracker */}
        <PlanViewTracker planId={id} />
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          header, footer, nav,
          .no-print,
          [class*="ShareButtons"],
          [class*="rounded-xl"][class*="border-primary"] {
            display: none !important;
          }
          .plan-printable {
            max-width: 100% !important;
            padding: 0 !important;
          }
          body {
            background: white !important;
            color: black !important;
          }
          .text-muted { color: #666 !important; }
          .text-primary { color: #2563eb !important; }
          .border-border { border-color: #e5e7eb !important; }
          .bg-surface { background: white !important; }
        }
      `}</style>
    </div>
  );
}
