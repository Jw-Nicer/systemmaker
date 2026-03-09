"use client";

import { useState } from "react";
import type { PreviewPlan } from "@/types/preview-plan";
import { ShareButtons } from "./ShareButtons";
import { EVENTS, track } from "@/lib/analytics";

interface PlanDisplayProps {
  plan: PreviewPlan;
  planId?: string;
  /** Show share/PDF buttons */
  showShare?: boolean;
  /** Enable section refinement (Phase 4C) */
  showRefine?: boolean;
  /** Called when a section refine is requested */
  onRefineSection?: (sectionKey: string) => void;
}

export function PlanDisplay({
  plan,
  planId,
  showShare = false,
  showRefine = false,
  onRefineSection,
}: PlanDisplayProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    scope: true,
    workflow: true,
    kpis: true,
    alerts: true,
    actions: true,
    roadmap: true,
  });

  function toggle(key: string) {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div className="space-y-4 print:space-y-6">
      {/* Executive Summary */}
      {plan.ops_pulse.executive_summary && plan.ops_pulse.executive_summary.problem && (
        <div className="rounded-lg border-2 border-primary/30 bg-primary/5 p-5 print:border-gray-300">
          <p className="text-xs text-primary uppercase tracking-wide font-medium mb-3">
            Executive Summary
          </p>
          <div className="space-y-2 text-sm">
            <p><span className="font-medium text-foreground">Problem:</span> <span className="text-muted">{plan.ops_pulse.executive_summary.problem}</span></p>
            <p><span className="font-medium text-foreground">Solution:</span> <span className="text-muted">{plan.ops_pulse.executive_summary.solution}</span></p>
            <p><span className="font-medium text-foreground">Expected Impact:</span> <span className="text-muted">{plan.ops_pulse.executive_summary.impact}</span></p>
            <p><span className="font-medium text-primary">Next Step:</span> <span className="text-foreground">{plan.ops_pulse.executive_summary.next_step}</span></p>
          </div>
        </div>
      )}

      {/* Warnings */}
      {plan.warnings && plan.warnings.length > 0 && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-4 print:hidden">
          <p className="text-xs text-yellow-400 uppercase tracking-wide font-medium mb-2">
            Consistency Notes
          </p>
          <ul className="text-xs text-muted space-y-1">
            {plan.warnings.map((w, i) => (
              <li key={i}>
                <span className="text-yellow-400">{w.section}:</span> {w.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Share bar */}
      {showShare && planId && (
        <div className="flex items-center justify-between print:hidden">
          <ShareButtons planId={planId} />
          <button
            onClick={() => {
              track(EVENTS.PLAN_PDF_DOWNLOAD, { plan_id: planId });
              window.print();
            }}
            className="text-xs text-muted hover:text-foreground transition-colors flex items-center gap-1.5"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path
                d="M4 6V2h8v4M4 12H2V8h12v4h-2M4 10h8v4H4v-4z"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinejoin="round"
              />
            </svg>
            Download PDF
          </button>
        </div>
      )}

      {/* Scope */}
      <PlanSection
        title="Suggested Scope"
        sectionKey="scope"
        expanded={expanded.scope}
        onToggle={() => toggle("scope")}
        showRefine={showRefine}
        onRefine={onRefineSection}
      >
        <p className="font-medium text-primary mb-2">
          {plan.intake.suggested_scope}
        </p>
        <p className="text-sm text-muted">{plan.intake.clarified_problem}</p>
        {plan.intake.assumptions.length > 0 && (
          <div className="mt-3">
            <p className="text-xs text-muted uppercase tracking-wide mb-1">
              Assumptions
            </p>
            <ul className="text-sm text-muted list-disc pl-4 space-y-0.5">
              {plan.intake.assumptions.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          </div>
        )}
        {plan.intake.constraints.length > 0 && (
          <div className="mt-3">
            <p className="text-xs text-muted uppercase tracking-wide mb-1">
              Constraints
            </p>
            <ul className="text-sm text-muted list-disc pl-4 space-y-0.5">
              {plan.intake.constraints.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </div>
        )}
      </PlanSection>

      {/* Workflow */}
      <PlanSection
        title={`Workflow Map (${plan.workflow.stages.length} stages)`}
        sectionKey="workflow"
        expanded={expanded.workflow}
        onToggle={() => toggle("workflow")}
        showRefine={showRefine}
        onRefine={onRefineSection}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted border-b border-border">
                <th className="pb-2 pr-4">#</th>
                <th className="pb-2 pr-4">Stage</th>
                <th className="pb-2 pr-4">Owner</th>
                <th className="pb-2 pr-4">Entry</th>
                <th className="pb-2">Exit</th>
              </tr>
            </thead>
            <tbody>
              {plan.workflow.stages.map((s, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td className="py-2 pr-4 text-muted">{i + 1}</td>
                  <td className="py-2 pr-4 font-medium">{s.name}</td>
                  <td className="py-2 pr-4 text-muted">{s.owner_role}</td>
                  <td className="py-2 pr-4 text-muted text-xs">
                    {s.entry_criteria}
                  </td>
                  <td className="py-2 text-muted text-xs">{s.exit_criteria}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {plan.workflow.failure_modes.length > 0 && (
          <div className="mt-3">
            <p className="text-xs text-muted uppercase tracking-wide mb-1">
              Failure Modes
            </p>
            <ul className="text-sm text-muted list-disc pl-4 space-y-0.5">
              {plan.workflow.failure_modes.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          </div>
        )}
      </PlanSection>

      {/* Dashboard KPIs */}
      <PlanSection
        title={`Dashboard KPIs (${plan.dashboard.kpis.length})`}
        sectionKey="kpis"
        expanded={expanded.kpis}
        onToggle={() => toggle("kpis")}
        showRefine={showRefine}
        onRefine={onRefineSection}
      >
        <div className="grid sm:grid-cols-2 gap-3">
          {plan.dashboard.kpis.map((k, i) => (
            <div
              key={i}
              className="rounded-lg border border-border bg-background p-4"
            >
              <p className="font-medium text-sm">{k.name}</p>
              <p className="text-xs text-muted mt-1">{k.definition}</p>
              <p className="text-xs text-muted/60 mt-1 italic">
                {k.why_it_matters}
              </p>
            </div>
          ))}
        </div>
        {plan.dashboard.dashboards.length > 0 && (
          <div className="mt-4">
            <p className="text-xs text-muted uppercase tracking-wide mb-2">
              Dashboards
            </p>
            {plan.dashboard.dashboards.map((d, i) => (
              <div key={i} className="mb-2">
                <p className="text-sm font-medium">{d.name}</p>
                <p className="text-xs text-muted">{d.purpose}</p>
              </div>
            ))}
          </div>
        )}
      </PlanSection>

      {/* Automations & Alerts */}
      <PlanSection
        title={`Automations & Alerts`}
        sectionKey="alerts"
        expanded={expanded.alerts}
        onToggle={() => toggle("alerts")}
        showRefine={showRefine}
        onRefine={onRefineSection}
      >
        {plan.automation.automations.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-muted uppercase tracking-wide mb-2">
              Automations
            </p>
            <div className="space-y-2">
              {plan.automation.automations.map((a, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-border bg-background p-3"
                >
                  <p className="text-sm font-medium">{a.trigger}</p>
                  <ol className="text-xs text-muted list-decimal pl-4 mt-1 space-y-0.5">
                    {a.steps.map((step, j) => (
                      <li key={j}>{step}</li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          </div>
        )}
        <p className="text-xs text-muted uppercase tracking-wide mb-2">
          Alerts
        </p>
        <ul className="space-y-2">
          {plan.automation.alerts.map((a, i) => (
            <li
              key={i}
              className="text-sm rounded-lg border border-border bg-background p-3"
            >
              <span className="font-medium">{a.when}</span>
              <span className="text-muted"> &rarr; notify </span>
              <span className="text-primary">{a.who}</span>
              <p className="text-xs text-muted mt-1">
                &ldquo;{a.message}&rdquo;
              </p>
            </li>
          ))}
        </ul>
      </PlanSection>

      {/* Ops Pulse / Recommended Actions */}
      <PlanSection
        title="Ops Pulse & Actions"
        sectionKey="actions"
        expanded={expanded.actions}
        onToggle={() => toggle("actions")}
        showRefine={showRefine}
        onRefine={onRefineSection}
      >
        {plan.ops_pulse.sections.map((section, i) => (
          <div key={i} className="mb-3">
            <p className="text-sm font-medium mb-1">{section.title}</p>
            <ul className="text-sm text-muted list-disc pl-4 space-y-0.5">
              {section.bullets.map((b, j) => (
                <li key={j}>{b}</li>
              ))}
            </ul>
          </div>
        ))}

        {plan.ops_pulse.actions.length > 0 && (
          <div className="mt-4">
            <p className="text-xs text-muted uppercase tracking-wide mb-2">
              Recommended Actions
            </p>
            <div className="space-y-2">
              {plan.ops_pulse.actions.map((a, i) => (
                <div key={i} className="flex items-start gap-3 text-sm">
                  <span
                    className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${
                      a.priority === "high"
                        ? "bg-red-500/10 text-red-400"
                        : a.priority === "medium"
                          ? "bg-yellow-500/10 text-yellow-400"
                          : "bg-green-500/10 text-green-400"
                    }`}
                  >
                    {a.priority}
                  </span>
                  <div>
                    <span className="text-muted">{a.owner_role}:</span>{" "}
                    {a.action}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {plan.ops_pulse.questions.length > 0 && (
          <div className="mt-4">
            <p className="text-xs text-muted uppercase tracking-wide mb-2">
              Questions to Explore
            </p>
            <ul className="text-sm text-muted list-disc pl-4 space-y-0.5">
              {plan.ops_pulse.questions.map((q, i) => (
                <li key={i}>{q}</li>
              ))}
            </ul>
          </div>
        )}
      </PlanSection>

      {/* Disclaimer */}
      <p className="text-xs text-muted/60 italic text-center pt-2 print:text-black/40">
        This is a draft preview &mdash; not a final recommendation. Assumptions
        may not match your exact setup.
      </p>
    </div>
  );
}

// ─── Section sub-component ──────────────────────────────────
function PlanSection({
  title,
  sectionKey,
  expanded,
  onToggle,
  showRefine,
  onRefine,
  children,
}: {
  title: string;
  sectionKey: string;
  expanded: boolean;
  onToggle: () => void;
  showRefine?: boolean;
  onRefine?: (sectionKey: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface overflow-hidden print:border-gray-200 print:break-inside-avoid">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-surface-light/50 transition-colors print:hover:bg-transparent"
      >
        <span className="text-sm font-medium">{title}</span>
        <span className="text-muted text-xs print:hidden">
          {expanded ? "−" : "+"}
        </span>
      </button>
      {expanded && (
        <div className="px-4 pb-4">
          {children}
          {showRefine && onRefine && (
            <button
              onClick={() => onRefine(sectionKey)}
              className="mt-3 text-xs text-primary hover:text-primary/80 transition-colors print:hidden"
            >
              Refine this section &rarr;
            </button>
          )}
        </div>
      )}
    </div>
  );
}
