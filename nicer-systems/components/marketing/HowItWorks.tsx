import type { ReactNode } from "react";
import type { LandingHowItWorksStep } from "@/types/variant";

const defaultSteps: LandingHowItWorksStep[] = [
  {
    id: "01",
    title: "Describe the bottleneck",
    description:
      "Share the workflow that keeps breaking down. The agent gathers the industry, bottleneck, tool stack, urgency, and volume before it builds anything.",
  },
  {
    id: "02",
    title: "Generate the preview plan",
    description:
      "The backend runs the planning pipeline and streams each section back as it is completed, so you can review the plan while it is still being assembled.",
  },
  {
    id: "03",
    title: "Share, refine, and follow up",
    description:
      "Once the plan is generated, you can share the public plan URL, print it to PDF, refine individual sections, or ask follow-up questions about the recommendation.",
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
        ["Captured", "Industry and workflow context", "intake"],
        ["Captured", "Current tools and constraints", "tool-stack"],
        ["Captured", "Urgency and operating volume", "priority"],
      ].map(([status, task, file]) => (
        <div
          key={task}
          className="grid grid-cols-[auto_1fr] items-center gap-3 rounded-[20px] border border-white/8 bg-white/[0.04] px-4 py-3 text-sm sm:grid-cols-[auto_1fr_auto] sm:gap-4"
        >
          <span className="rounded-full border border-[#59725b]/30 bg-[#27392a] px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-[#dce7d9]">
            {status}
          </span>
          <span className="text-[#eef2ea]">{task}</span>
          <span className="col-span-2 font-mono text-[#97aa97] sm:col-span-1">
            {file}
          </span>
        </div>
      ))}
    </div>
  ),
  (
    <div className="space-y-4" key="step-panel-02">
      <div className="grid gap-3 md:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[24px] border border-white/8 bg-black/18 p-4 text-sm text-[#dce4d8]">
          <p className="text-[11px] uppercase tracking-[0.14em] text-[#92a792]">
            Output
          </p>
          <ul className="mt-3 space-y-2">
            <li>• Clarified workflow scope and assumptions</li>
            <li>• KPI and dashboard recommendations</li>
            <li>• Alerts and recommended next actions</li>
          </ul>
        </div>
        <div className="rounded-[24px] border border-white/8 bg-[#102016] p-4 font-mono text-xs text-[#ccd7c8]">
          <p>phase: building</p>
          <p>emit: intake</p>
          <p>emit: workflow</p>
          <p className="mt-3 text-[#8ea48d]">
            persisting preview plan and share link
          </p>
        </div>
      </div>
      <div className="rounded-[24px] border border-white/8 bg-white/[0.04] p-4">
        <div className="flex flex-col gap-3 text-sm text-[#eef2ea] sm:flex-row sm:items-center sm:justify-between">
          <span>Build preview plan for dispatch workflow</span>
          <span className="rounded-full border border-[#6e866f]/30 bg-[#203026] px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-[#aec2ad]">
            streaming
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
            <th className="px-4 py-3">Section</th>
            <th className="px-4 py-3">Count</th>
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {[
            ["Suggested scope", "1", "Ready"],
            ["Workflow map", "5", "Ready"],
            ["Dashboard KPIs", "6", "Ready"],
            ["Alerts", "4", "Ready"],
          ].map(([name, count, status]) => (
            <tr key={name} className="border-b border-white/6 last:border-b-0">
              <td className="px-4 py-3">{name}</td>
              <td className="px-4 py-3">{count}</td>
              <td className="px-4 py-3 text-[#a9c1a8]">{status}</td>
            </tr>
          ))}
        </tbody>
        </table>
      </div>
      <p className="px-4 py-3 text-xs text-[#8fa08f]">
        Shared plans remain available through a public plan URL when the saved
        plan is marked public.
      </p>
    </div>
  ),
];

export function HowItWorks({
  eyebrow = "How it works",
  title = "From bottleneck\nto preview plan",
  steps = defaultSteps,
}: {
  eyebrow?: string;
  title?: string;
  steps?: LandingHowItWorksStep[];
} = {}) {
  return (
    <section
      id="how-it-works"
      className="relative overflow-hidden border-b border-[#d9d1c3] bg-[#f4efe5] py-16 text-[#1d2318] sm:py-20"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(28,54,42,0.20),transparent_20%),radial-gradient(circle_at_20%_50%,rgba(28,54,42,0.10),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(207,188,154,0.14),transparent_30%)]" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
        <div className="mx-auto mb-12 max-w-3xl text-center sm:mb-16">
          <p className="text-[11px] uppercase tracking-[0.14em] text-[#7b7c6f] sm:tracking-[0.18em]">
            {eyebrow}
          </p>
          <h2 className="mt-4 font-[var(--font-editorial)] text-4xl leading-[0.95] tracking-[-0.04em] text-[#1d2318] sm:text-5xl md:text-7xl">
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
              <div className="rounded-[24px] border border-[#d8d0c2] bg-[#f8f4ea] p-6 text-[#1e2419] shadow-[0_22px_70px_rgba(40,66,38,0.10)] sm:rounded-[30px] sm:p-8">
                <p className="text-[11px] uppercase tracking-[0.14em] text-[#7c7c72]">
                  {step.id}
                </p>
                <h3 className="mt-4 font-[var(--font-editorial)] text-3xl leading-tight sm:mt-5 sm:text-4xl">
                  {step.title}
                </h3>
                <p className="mt-4 text-base leading-7 text-[#4c5648]">
                  {step.description}
                </p>
              </div>

              <div className="rounded-[28px] border border-[#2f4c37]/20 bg-[linear-gradient(180deg,rgba(28,54,42,0.98),rgba(20,36,27,0.96))] p-4 text-[#edf2e8] shadow-[0_30px_90px_rgba(13,24,18,0.28)] sm:rounded-[34px] sm:p-5">
                {defaultPanels[index] ?? defaultPanels[defaultPanels.length - 1]}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
