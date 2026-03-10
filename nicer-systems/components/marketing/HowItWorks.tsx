import type { ReactNode } from "react";
import type { LandingHowItWorksStep } from "@/types/variant";

const defaultSteps: LandingHowItWorksStep[] = [
  {
    id: "01",
    title: "Tell us the problem",
    description:
      "Describe the workflow that causes delays, errors, or extra hours. We ask a few short questions to understand the context \u2014 your industry, the process, and the tools you already use.",
  },
  {
    id: "02",
    title: "Get your preview plan",
    description:
      "We map the workflow end to end, define the metrics that matter, and outline the alerts and automations that fix the bottleneck. The full plan is ready in under a minute.",
  },
  {
    id: "03",
    title: "Decide with clarity",
    description:
      "Share the plan with your team, refine any section with feedback, and use it to align everyone on the fix \u2014 before any build work starts.",
  },
];

const defaultPanels: ReactNode[] = [
  (
    <div className="space-y-4" key="step-panel-01">
      <div className="rounded-[24px] border border-white/10 bg-black/15 p-4">
        <div className="flex items-center justify-between rounded-full border border-white/10 bg-black/18 px-4 py-3 text-sm text-[#dde6d8]">
          <span>
            Our dispatch workflow stalls between assignment, pickup, and
            delivery confirmation.
          </span>
          <span className="text-lg">+</span>
        </div>
      </div>
      {[
        ["Captured", "Your industry and workflow"],
        ["Captured", "Tools you already use"],
        ["Captured", "Timeline and scale"],
      ].map(([status, task]) => (
        <div
          key={task}
          className="grid grid-cols-[auto_1fr] items-center gap-3 rounded-[20px] border border-white/8 bg-white/[0.04] px-4 py-3 text-sm"
        >
          <span className="rounded-full border border-[#59725b]/30 bg-[#27392a] px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-[#dce7d9]">
            {status}
          </span>
          <span className="text-[#eef2ea]">{task}</span>
        </div>
      ))}
    </div>
  ),
  (
    <div className="space-y-4" key="step-panel-02">
      <div className="rounded-[24px] border border-white/8 bg-black/18 p-4 text-sm text-[#dce4d8]">
        <p className="text-[11px] uppercase tracking-[0.14em] text-[#92a792]">
          Your plan includes
        </p>
        <ul className="mt-3 space-y-2">
          <li>• Workflow map — 5 stages with owners and handoffs</li>
          <li>• Dashboard KPIs — 6 metrics with targets</li>
          <li>• Smart alerts — 4 triggers with escalation rules</li>
          <li>• Next actions — prioritised recommendations</li>
        </ul>
      </div>
      <div className="rounded-[24px] border border-white/8 bg-white/[0.04] p-4">
        <div className="flex flex-col gap-3 text-sm text-[#eef2ea] sm:flex-row sm:items-center sm:justify-between">
          <span>Build preview plan for dispatch workflow</span>
          <span className="rounded-full border border-[#6e866f]/30 bg-[#203026] px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-[#aec2ad]">
            Ready in under a minute
          </span>
        </div>
      </div>
    </div>
  ),
  (
    <div
      className="overflow-hidden rounded-[24px] border border-white/8 bg-white/[0.04]"
      key="step-panel-03"
    >
      <div className="overflow-x-auto">
        <table className="min-w-[420px] w-full text-left text-sm text-[#dde5da]">
        <thead className="border-b border-white/8 bg-black/18 text-[11px] uppercase tracking-[0.14em] text-[#96aa95]">
          <tr>
            <th className="px-4 py-3">What you get</th>
            <th className="px-4 py-3">Details</th>
            <th className="px-4 py-3">Included</th>
          </tr>
        </thead>
        <tbody>
          {[
            ["Suggested scope", "Clarified problem and assumptions", "Yes"],
            ["Workflow map", "5 stages with owners and handoffs", "Yes"],
            ["Dashboard KPIs", "6 metrics with targets", "Yes"],
            ["Smart alerts", "4 triggers with escalation rules", "Yes"],
            ["Next actions", "Prioritised recommendations", "Yes"],
          ].map(([name, details, included]) => (
            <tr key={name} className="border-b border-white/6 last:border-b-0">
              <td className="px-4 py-3">{name}</td>
              <td className="px-4 py-3">{details}</td>
              <td className="px-4 py-3 text-[#a9c1a8]">{included}</td>
            </tr>
          ))}
        </tbody>
        </table>
      </div>
      <p className="px-4 py-3 text-xs text-[#8fa08f]">
        Share with your team via link or PDF. Refine any section and get an
        updated plan instantly.
      </p>
    </div>
  ),
];

export function HowItWorks({
  eyebrow = "How it works",
  title = "From bottleneck\nto action plan",
  steps = defaultSteps,
}: {
  eyebrow?: string;
  title?: string;
  steps?: LandingHowItWorksStep[];
} = {}) {
  return (
    <section
      id="how-it-works"
      className="relative overflow-hidden border-b border-[var(--border-light)] bg-[var(--cream-bg)] py-16 text-[var(--text-heading)] sm:py-24"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(28,54,42,0.20),transparent_20%),radial-gradient(circle_at_20%_50%,rgba(28,54,42,0.10),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(207,188,154,0.14),transparent_30%)]" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
        <div className="mx-auto mb-12 max-w-3xl text-center sm:mb-16">
          <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)] sm:tracking-[0.18em]">
            {eyebrow}
          </p>
          <h2 className="mt-4 font-[var(--font-editorial)] text-4xl leading-[0.95] tracking-[-0.04em] text-[var(--text-heading)] sm:text-5xl md:text-7xl">
            {title.split("\n").map((line, index, arr) => (
              <span key={`${line}-${index}`}>
                {line}
                {index < arr.length - 1 && <br />}
              </span>
            ))}
          </h2>
        </div>

        <div className="space-y-10 sm:space-y-16">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className="grid gap-6 lg:grid-cols-[360px_1fr] lg:items-start lg:gap-8"
            >
              <div className="rounded-[var(--radius-card)] border border-[var(--border-card)] bg-[var(--cream-card)] p-6 text-[var(--text-heading)] shadow-[var(--shadow-card)] sm:rounded-[var(--radius-card-lg)] sm:p-8">
                <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">
                  {step.id}
                </p>
                <h3 className="mt-4 font-[var(--font-editorial)] text-3xl leading-tight sm:mt-5 sm:text-4xl">
                  {step.title}
                </h3>
                <p className="mt-4 text-base leading-7 text-[var(--text-body)]">
                  {step.description}
                </p>
              </div>

              <div className="rounded-[var(--radius-card-lg)] border border-[#2f4c37]/20 bg-[linear-gradient(180deg,rgba(28,54,42,0.98),rgba(20,36,27,0.96))] p-4 text-[#edf2e8] shadow-[var(--shadow-elevated)] sm:rounded-[var(--radius-card-lg)] sm:p-5">
                {defaultPanels[index] ?? defaultPanels[defaultPanels.length - 1]}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
