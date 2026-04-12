import type { PlanSectionType } from "@/types/chat";
import type {
  PreviewPlan,
  IntakeOutput,
  WorkflowMapperOutput,
  DashboardDesignerOutput,
  AutomationDesignerOutput,
  OpsPulseOutput,
  ImplementationSequencerOutput,
  ProposalOutput,
} from "@/types/preview-plan";

export type RefineSectionKey =
  | "scope"
  | "workflow"
  | "kpis"
  | "alerts"
  | "actions"
  | "roadmap";

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
    case "roadmap":
      return "implementation_sequencer";
    default: {
      const _exhaustive: never = sectionKey;
      throw new Error(`Unknown refine section key: ${_exhaustive}`);
    }
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
    case "implementation_sequencer":
      return { ...plan, roadmap: refined as ImplementationSequencerOutput };
    case "proposal_writer":
      return { ...plan, proposal: refined as ProposalOutput };
    default: {
      const _exhaustive: never = section;
      throw new Error(`Unknown plan section: ${_exhaustive}`);
    }
  }
}
