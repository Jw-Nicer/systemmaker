import type { LandingFeatureItem } from "@/types/variant";

const defaultFeatures: LandingFeatureItem[] = [
  {
    id: "01",
    title: "Workflow mapping built around your existing process",
    description:
      "We start from the bottleneck you already have. No generic automation pitch — we map your actual workflow, identify the handoff gaps, and scope a concrete fix.",
    visual: "Workflow map with stages, owners, and handoff points",
  },
  {
    id: "02",
    title: "KPI and dashboard recommendations",
    description:
      "Each preview plan defines the KPIs and dashboard views that should exist for the workflow before implementation starts.",
    visual: "Cycle time, stuck items, throughput, and SLA metrics",
  },
  {
    id: "03",
    title: "Alerts and next actions before problems escalate",
    description:
      "The plan includes alert recommendations and ownership so the output ends with decisions and next steps, not just a diagram.",
    visual: "Alert triggers, escalation owners, and next actions",
  },
  {
    id: "04",
    title: "Shareable plan output",
    description:
      "Completed preview plans can be shared by URL, printed to PDF, and refined section by section as the recommendation evolves.",
    visual: "Shareable link with section-by-section refinement",
  },
];

export function ComputerFeatures({
  eyebrow = "Deliverables",
  title = "What you get",
  features = defaultFeatures,
}: {
  eyebrow?: string;
  title?: string;
  features?: LandingFeatureItem[];
} = {}) {
  return (
    <section id="features" className="border-b border-[#d9d1c3] bg-[var(--cream-bg)] py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
        <div className="mb-12 max-w-3xl sm:mb-16">
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">
            {eyebrow}
          </p>
          <h2 className="mt-4 font-[var(--font-editorial)] text-4xl leading-[0.96] tracking-[-0.04em] text-[var(--text-heading)] sm:text-5xl md:text-7xl">
            {title}
          </h2>
        </div>

        <div className="divide-y divide-[var(--border-subtle)] border-y border-[var(--border-subtle)]">
          {features.map((feature, index) => (
            <div
              key={feature.id}
              className="grid gap-6 py-8 sm:gap-8 sm:py-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center"
            >
              <div className="max-w-xl">
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">
                  {feature.id}
                </p>
                <h3 className="mt-4 font-[var(--font-editorial)] text-3xl leading-tight text-[var(--text-heading)] md:text-4xl">
                  {feature.title}
                </h3>
                <p className="mt-4 text-base leading-7 text-[var(--text-body)]">
                  {feature.description}
                </p>
              </div>

              <div className="relative overflow-hidden rounded-[var(--radius-card)] border border-white/60 bg-[linear-gradient(180deg,rgba(248,244,234,0.95),rgba(226,218,204,0.95))] p-4 shadow-[var(--shadow-card)] sm:rounded-[var(--radius-card-lg)] sm:p-5">
                <div className="computer-feature-visual relative min-h-[240px] rounded-[24px] sm:min-h-[280px] sm:rounded-[28px]">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.95),transparent_15%),radial-gradient(circle_at_70%_30%,rgba(182,195,171,0.55),transparent_28%),linear-gradient(180deg,rgba(203,218,196,0.3),rgba(108,129,105,0.28),rgba(68,86,63,0.38))]" />
                  <div className="absolute inset-x-5 bottom-8 top-8 rounded-[999px] border border-white/50 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.95),rgba(214,233,217,0.25)_32%,rgba(38,62,44,0.26)_100%)] shadow-[inset_0_0_30px_rgba(255,255,255,0.32),0_18px_40px_rgba(22,42,28,0.18)] sm:inset-x-10 sm:bottom-10 sm:top-10" />
                  <div className="absolute bottom-5 left-5 right-5 rounded-[20px] bg-[#1d251b]/88 px-4 py-3 text-sm leading-6 text-[#eef4ea] shadow-[0_12px_30px_rgba(14,20,12,0.22)] sm:bottom-8 sm:left-8 sm:right-auto sm:max-w-xs sm:rounded-[24px]">
                    {feature.visual}
                  </div>
                  {index % 2 === 0 && (
                    <div className="absolute right-5 top-5 rounded-[16px] border border-white/35 bg-white/45 px-3 py-2 text-[11px] font-medium tracking-[0.08em] text-[#364133] sm:right-10 sm:top-12 sm:rounded-[20px] sm:px-4 sm:text-xs">
                      Preview plan output
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
