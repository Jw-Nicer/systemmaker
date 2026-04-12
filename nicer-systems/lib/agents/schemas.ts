/**
 * Stage Output Guardrails — Zod schemas for agent pipeline outputs.
 *
 * Single source of truth for output validation. Each schema defines the
 * exact structure an agent stage must produce. These are the "output
 * guardrails" — enforcing structural correctness before safety checks.
 *
 * Used by:
 * - runner.ts (pipeline stage validation)
 * - self-correction.ts (validation error → correction prompt)
 * - refinement.ts (refined section validation)
 * - validation.ts (sendEmailSchema references)
 */
import { z } from "zod";

/** Priority levels used across actions and alerts. */
const priorityEnum = z.enum(["high", "medium", "low"]);

// --- Intake Agent ---

export const intakeOutputSchema = z.object({
  clarified_problem: z.string().min(20).max(5000),
  assumptions: z.array(z.string().min(10).max(1000)).min(1).max(10),
  constraints: z.array(z.string().min(10).max(1000)).min(1).max(10),
  suggested_scope: z.string().min(10).max(5000),
});

// --- Workflow Mapper ---

export const workflowStageSchema = z.object({
  name: z.string().min(3).max(500),
  owner_role: z.string().min(3).max(500),
  entry_criteria: z.string().min(10).max(2000),
  exit_criteria: z.string().min(10).max(2000),
});

export const workflowMapperOutputSchema = z.object({
  stages: z.array(workflowStageSchema).min(3).max(12),
  required_fields: z.array(z.string().min(2).max(500)).min(3).max(30),
  timestamps: z.array(z.string().min(2).max(500)).min(2).max(20),
  failure_modes: z.array(z.string().min(10).max(1000)).min(2).max(15),
});

// --- Automation Designer ---

const automationPlatformEnum = z.enum(["zapier", "make", "n8n", "google_apps_script", "custom"]);

export const automationDesignerOutputSchema = z.object({
  automations: z.array(
    z.object({
      trigger: z.string().min(10).max(1000),
      steps: z.array(z.string().min(5).max(500)).min(1).max(20),
      data_required: z.array(z.string().min(2).max(500)).min(1).max(20),
      error_handling: z.string().min(10).max(1000),
      platform: automationPlatformEnum.optional(),
      setup_instructions: z.string().max(2000).optional(),
      estimated_setup_minutes: z.number().min(1).max(480).optional(),
    })
  ).min(1).max(30),
  alerts: z.array(
    z.object({
      when: z.string().min(10).max(1000),
      who: z.string().min(3).max(500),
      message: z.string().min(10).max(1000),
      escalation: z.string().min(10).max(1000),
    })
  ).min(1).max(20),
  logging_plan: z.array(
    z.object({
      what_to_log: z.string().min(3).max(500),
      where: z.string().min(3).max(500),
      how_to_review: z.string().min(5).max(500),
    })
  ).min(1).max(20),
});

// --- Dashboard Designer ---

export const dashboardDesignerOutputSchema = z.object({
  dashboards: z.array(
    z.object({
      name: z.string().min(3).max(500),
      purpose: z.string().min(10).max(1000),
      widgets: z.array(z.string().min(5).max(500)).min(1).max(20),
    })
  ).min(1).max(10),
  kpis: z.array(
    z.object({
      name: z.string().min(3).max(500),
      definition: z.string().min(20).max(1500),
      why_it_matters: z.string().min(10).max(1000),
    })
  ).min(3).max(20),
  views: z.array(
    z.object({
      name: z.string().min(3).max(500),
      filter: z.string().min(3).max(500),
      columns: z.array(z.string().min(2).max(500)).min(2).max(20),
    })
  ).min(1).max(15),
});

// --- Ops Pulse Writer ---

export const executiveSummarySchema = z.object({
  problem: z.string().min(20).max(2000),
  solution: z.string().min(20).max(2000),
  impact: z.string().min(10).max(2000),
  next_step: z.string().min(10).max(2000),
});

export const opsPulseOutputSchema = z.object({
  executive_summary: executiveSummarySchema,
  sections: z.array(
    z.object({
      title: z.string().min(3).max(500),
      bullets: z.array(z.string().min(5).max(500)).min(1).max(20),
    })
  ).min(2).max(10),
  scorecard: z.array(z.string().min(5).max(500)).min(2).max(20),
  actions: z.array(
    z.object({
      priority: priorityEnum,
      owner_role: z.string().min(3).max(200),
      action: z.string().min(10).max(1000),
    })
  ).min(1).max(20),
  questions: z.array(z.string().min(10).max(1000)).min(1).max(10),
});

// --- Implementation Sequencer ---

const effortEnum = z.enum(["small", "medium", "large"]);

export const implementationSequencerOutputSchema = z.object({
  phases: z.array(
    z.object({
      week: z.number().min(1).max(12),
      title: z.string().min(5).max(500),
      tasks: z.array(
        z.object({
          task: z.string().min(10).max(2000),
          effort: effortEnum,
          owner_role: z.string().min(3).max(200),
        })
      ).min(1).max(10),
      dependencies: z.array(z.string().max(500)).min(0).max(10),
      risks: z.array(z.string().min(10).max(500)).min(1).max(5),
      quick_wins: z.array(z.string().min(5).max(500)).min(0).max(5),
    })
  ).min(2).max(8),
  critical_path: z.string().min(10).max(2000),
  total_estimated_weeks: z.number().min(2).max(12),
});

// --- Proposal Writer ---

export const proposalOutputSchema = z.object({
  executive_pitch: z.string().min(50).max(5000),
  value_propositions: z
    .array(
      z.object({
        claim: z.string().min(10).max(1000),
        evidence: z.string().min(10).max(2000),
        metric: z.string().min(5).max(500),
      })
    )
    .min(2)
    .max(6),
  risk_of_inaction: z.array(z.string().min(10).max(1000)).min(1).max(5),
  recommended_engagement: z.string().min(20).max(3000),
  estimated_roi: z.string().min(10).max(2000),
});

// --- Stage output guardrails: template key → Zod schema ---

export const stageOutputGuardrails: Partial<Record<string, z.ZodTypeAny>> = {
  intake_agent: intakeOutputSchema,
  workflow_mapper: workflowMapperOutputSchema,
  automation_designer: automationDesignerOutputSchema,
  dashboard_designer: dashboardDesignerOutputSchema,
  ops_pulse_writer: opsPulseOutputSchema,
  implementation_sequencer: implementationSequencerOutputSchema,
  proposal_writer: proposalOutputSchema,
};

/** @deprecated Use stageOutputGuardrails */
export const templateOutputSchemas = stageOutputGuardrails;
