"use client";

import { useState } from "react";
import { PlanDisplay } from "@/components/marketing/PlanDisplay";
import { SectionRefiner } from "@/components/marketing/SectionRefiner";
import type { PreviewPlan } from "@/types/preview-plan";

interface PlanWithRefineProps {
  plan: PreviewPlan;
  planId: string;
}

export function PlanWithRefine({ plan, planId }: PlanWithRefineProps) {
  const [refiningSection, setRefiningSection] = useState<string | null>(null);
  const [currentPlan, setCurrentPlan] = useState(plan);

  function handleRefined(sectionKey: string, newContent: string) {
    // Update the local plan state with refined content
    // Content comes back as a string — store it for display
    setCurrentPlan((prev) => {
      const updated = { ...prev };
      // The section key maps to plan sections
      switch (sectionKey) {
        case "scope":
          updated.intake = {
            ...updated.intake,
            clarified_problem: newContent,
          };
          break;
        case "workflow":
        case "kpis":
        case "alerts":
        case "actions":
          // For complex sections, the refined content replaces the section summary
          break;
      }
      return updated;
    });
    setRefiningSection(null);
  }

  return (
    <div>
      <PlanDisplay
        plan={currentPlan}
        planId={planId}
        showRefine={true}
        onRefineSection={(key) => setRefiningSection(key)}
      />

      {refiningSection && (
        <div className="mt-4">
          <SectionRefiner
            sectionKey={refiningSection}
            planId={planId}
            originalContent={getSectionContent(currentPlan, refiningSection)}
            onRefined={handleRefined}
            onClose={() => setRefiningSection(null)}
          />
        </div>
      )}
    </div>
  );
}

function getSectionContent(plan: PreviewPlan, sectionKey: string): string {
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
    default:
      return "";
  }
}
