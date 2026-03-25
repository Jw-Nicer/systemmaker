"use client";

import { useState, useEffect, useRef } from "react";
import { PlanDisplay } from "@/components/marketing/PlanDisplay";
import { SectionRefiner } from "@/components/marketing/SectionRefiner";
import type { PreviewPlan } from "@/types/preview-plan";
import type { RefineSectionKey } from "@/lib/plans/refinement";
import {
  applyRefinedSection,
  mapRefineSectionKeyToPlanSection,
} from "@/lib/plans/refinement";

interface PlanWithRefineProps {
  plan: PreviewPlan;
  planId: string;
}

export function PlanWithRefine({ plan, planId }: PlanWithRefineProps) {
  const [refiningSection, setRefiningSection] = useState<RefineSectionKey | null>(null);
  const [currentPlan, setCurrentPlan] = useState(plan);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    return () => clearTimeout(saveTimerRef.current);
  }, []);

  function handleRefined(sectionKey: RefineSectionKey, newContent: string) {
    try {
      const parsed = JSON.parse(newContent) as unknown;
      const planSection = mapRefineSectionKeyToPlanSection(sectionKey);
      setCurrentPlan((prev) => applyRefinedSection(prev, planSection, parsed));
      setRefiningSection(null);
      setSaveStatus("saved");
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => setSaveStatus("idle"), 3000);
    } catch {
      setSaveStatus("error");
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => setSaveStatus("idle"), 5000);
    }
  }

  return (
    <div>
        <PlanDisplay
          plan={currentPlan}
          planId={planId}
          showRefine={true}
          onRefineSection={(key) => setRefiningSection(key as RefineSectionKey)}
        />

      {saveStatus === "saved" && (
        <div className="flex items-center justify-center gap-1.5 py-2 text-xs text-green-400">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Changes saved
        </div>
      )}

      {saveStatus === "error" && (
        <div className="flex items-center justify-center gap-1.5 py-2 text-xs text-red-400">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Failed to apply changes
        </div>
      )}

      {refiningSection && (
        <div className="mt-4">
          <SectionRefiner
            sectionKey={refiningSection}
            planId={planId}
            originalContent={getSectionContent(currentPlan, refiningSection)}
            plan={currentPlan}
            onRefined={handleRefined}
            onClose={() => setRefiningSection(null)}
          />
        </div>
      )}
    </div>
  );
}

function getSectionContent(plan: PreviewPlan, sectionKey: RefineSectionKey): string {
  switch (sectionKey) {
    case "scope":
      return [
        plan.intake.suggested_scope,
        plan.intake.clarified_problem,
        plan.intake.assumptions.length > 0
          ? `Assumptions: ${plan.intake.assumptions.join(", ")}`
          : "",
        plan.intake.constraints.length > 0
          ? `Constraints: ${plan.intake.constraints.join(", ")}`
          : "",
      ]
        .filter(Boolean)
        .join("\n\n");
    case "workflow":
      return plan.workflow.stages
        .map(
          (s, i) =>
            `${i + 1}. ${s.name} (${s.owner_role}): ${s.entry_criteria} → ${s.exit_criteria}`
        )
        .join("\n");
    case "kpis":
      return plan.dashboard.kpis
        .map((k) => `${k.name}: ${k.definition} — ${k.why_it_matters}`)
        .join("\n");
    case "alerts":
      return [
        ...plan.automation.automations.map(
          (a) => `Trigger: ${a.trigger}\nSteps: ${a.steps.join(", ")}`
        ),
        ...plan.automation.alerts.map(
          (a) => `When: ${a.when} → Notify: ${a.who} — "${a.message}"`
        ),
      ].join("\n\n");
    case "actions":
      return [
        ...plan.ops_pulse.sections.map(
          (s) => `${s.title}:\n${s.bullets.map((b) => `• ${b}`).join("\n")}`
        ),
        ...plan.ops_pulse.actions.map(
          (a) => `[${a.priority}] ${a.owner_role}: ${a.action}`
        ),
      ].join("\n\n");
    case "roadmap": {
      if (!plan.roadmap) return "No roadmap generated yet.";
      const phases = plan.roadmap.phases
        .map((p) => {
          const tasks = p.tasks
            .map((t) => `- [${t.effort}] ${t.task} (${t.owner_role})`)
            .join("\n");
          const deps =
            p.dependencies.length > 0
              ? p.dependencies.join(", ")
              : "none";
          const quickWins =
            p.quick_wins.length > 0
              ? `Quick wins: ${p.quick_wins.join(", ")}`
              : "";
          const risks =
            p.risks.length > 0 ? `Risks: ${p.risks.join(", ")}` : "";
          return [
            `Week ${p.week}: ${p.title}`,
            `Tasks:\n${tasks}`,
            `Dependencies: ${deps}`,
            quickWins,
            risks,
          ]
            .filter(Boolean)
            .join("\n");
        })
        .join("\n\n");
      return [
        phases,
        `Critical path: ${plan.roadmap.critical_path}`,
        `Total estimated weeks: ${plan.roadmap.total_estimated_weeks}`,
      ].join("\n\n");
    }
    default:
      return "";
  }
}
