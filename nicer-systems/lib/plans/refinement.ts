import type { PlanSectionType } from "@/types/chat";
import type {
  PreviewPlan,
  IntakeOutput,
  WorkflowMapperOutput,
  DashboardDesignerOutput,
  AutomationDesignerOutput,
  OpsPulseOutput,
} from "@/types/preview-plan";

export type RefineSectionKey =
  | "scope"
  | "workflow"
  | "kpis"
  | "alerts"
  | "actions";

export function mapRefineSectionKeyToPlanSection(
  sectionKey: RefineSectionKey
): PlanSectionType {
  switch (sectionKey) {
    case "scope":
      return "intake";
    case "workflow":
      return "workflow";
    case "kpis":
      return "dashboard";
    case "alerts":
      return "automation";
    case "actions":
      return "ops_pulse";
  }
}

export function applyRefinedSection(
  plan: PreviewPlan,
  section: PlanSectionType,
  refined: unknown
): PreviewPlan {
  switch (section) {
    case "intake":
      return { ...plan, intake: refined as IntakeOutput };
    case "workflow":
      return { ...plan, workflow: refined as WorkflowMapperOutput };
    case "dashboard":
      return { ...plan, dashboard: refined as DashboardDesignerOutput };
    case "automation":
      return { ...plan, automation: refined as AutomationDesignerOutput };
    case "ops_pulse":
      return { ...plan, ops_pulse: refined as OpsPulseOutput };
  }
}
