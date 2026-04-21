import { z } from "zod";
import { EXPERIMENT_TARGETS } from "@/lib/constants/experiments";
import {
  AUDIT_TIME_LOST,
} from "@/types/audit";

const experimentAssignmentSchema = z.object({
  experiment_id: z.string().min(1).max(128),
  experiment_name: z.string().min(1).max(200),
  target: z.string().min(1).max(100),
  variant_key: z.string().min(1).max(100),
  variant_label: z.string().min(1).max(200),
});

const auditLabelSchema = (field: string, max: number) =>
  z.string().trim().min(1, `${field} is required`).max(max);

export const leadSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Valid email is required"),
  company: z.string().min(1, "Company is required").max(100),
  bottleneck: z.string().max(1000).optional(),
  tools: z.string().max(500).optional(),
  urgency: z.enum(["low", "medium", "high", "urgent"]).optional(),
  utm_source: z.string().max(200).optional(),
  utm_medium: z.string().max(200).optional(),
  utm_campaign: z.string().max(200).optional(),
  utm_content: z.string().max(200).optional(),
  landing_path: z.string().max(500).optional(),
  experiment_assignments: z.array(experimentAssignmentSchema).max(10).optional(),
});

export type LeadInput = z.infer<typeof leadSchema>;

export const caseStudySchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  slug: z.string().min(1, "Slug is required").max(200),
  client_name: z.string().min(1, "Client name is required").max(100),
  industry: z.string().min(1, "Industry is required").max(100),
  workflow_type: z.string().max(100).optional(),
  tools: z.array(z.string().min(1).max(100)).min(1, "At least one tool is required"),
  challenge: z.string().min(1, "Challenge is required").max(5000),
  solution: z.string().min(1, "Solution is required").max(5000),
  metrics: z
    .array(
      z.object({
        label: z.string().min(1, "Label is required").max(100),
        before: z.string().min(1, "Before value is required").max(100),
        after: z.string().min(1, "After value is required").max(100),
      })
    )
    .min(1, "At least one metric is required"),
  result_categories: z.array(z.enum([
    "time_saved",
    "error_reduction",
    "cost_reduction",
    "visibility_gained",
    "throughput_increase",
    "compliance_achieved",
  ])).optional(),
  thumbnail_url: z.string().max(500).optional(),
  status: z.enum(["draft", "review", "published", "archived"]),
  sort_order: z.number().int().min(0),
});

export type CaseStudyInput = z.infer<typeof caseStudySchema>;

export const testimonialSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  role: z.string().min(1, "Role is required").max(100),
  company: z.string().min(1, "Company is required").max(100),
  quote: z.string().min(1, "Quote is required").max(2000),
  avatar_url: z.string().max(500).optional(),
  is_published: z.boolean(),
  sort_order: z.number().int().min(0),
});

export type TestimonialInput = z.infer<typeof testimonialSchema>;

export const faqSchema = z.object({
  question: z.string().min(1, "Question is required").max(500),
  answer: z.string().min(1, "Answer is required").max(5000),
  is_published: z.boolean(),
  sort_order: z.number().int().min(0),
});

export type FAQInput = z.infer<typeof faqSchema>;

// IndustryProbing — per-industry context for the chat agent
const stringList = (max: number, itemMax = 200) =>
  z
    .array(z.string().min(1).max(itemMax))
    .max(max)
    .default([]);

// HomepageLayout — admin-managed section ordering + visibility
import { HOMEPAGE_SECTION_KEYS } from "@/types/homepage-layout";

export const homepageSectionSchema = z.object({
  key: z.enum(HOMEPAGE_SECTION_KEYS),
  enabled: z.boolean(),
  sort_order: z.number().int().min(0).max(100),
});

export const homepageLayoutSchema = z.object({
  sections: z
    .array(homepageSectionSchema)
    .min(1, "At least one section is required")
    .max(50, "Too many sections"),
});

export type HomepageLayoutInput = z.infer<typeof homepageLayoutSchema>;

export const industryProbingSchema = z.object({
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(80)
    .regex(/^[a-z0-9 \-&]+$/i, "Slug can only contain letters, numbers, spaces, hyphens, and &")
    .transform((s) => s.toLowerCase().trim()),
  display_name: z.string().min(1, "Display name is required").max(120),
  common_bottlenecks: stringList(20, 200),
  common_tools: stringList(20, 200),
  probing_angles: stringList(20, 400),
  aliases: stringList(30, 80),
  is_published: z.boolean(),
  sort_order: z.number().int().min(0).default(0),
});

export type IndustryProbingInput = z.infer<typeof industryProbingSchema>;

export const offerSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  price: z.string().min(1, "Price is required").max(100),
  description: z.string().min(1, "Description is required").max(500),
  features: z.array(z.string().min(1).max(200)).min(1, "At least one feature is required"),
  cta: z.string().min(1, "CTA text is required").max(100),
  cta_action: z.enum(["audit", "contact", "booking"]).optional(),
  highlighted: z.boolean(),
  is_published: z.boolean(),
  sort_order: z.number().int().min(0),
});

export type OfferInput = z.infer<typeof offerSchema>;

export const eventSchema = z.object({
  event_name: z.string().min(1).max(100),
  payload: z.record(z.string(), z.unknown()).optional(),
  lead_id: z.string().min(1).max(128).optional(),
});

export const agentRunSchema = z.object({
  industry: z.string().min(1, "Industry is required").max(100),
  bottleneck: z.string().min(1, "Bottleneck description is required").max(2000),
  current_tools: z.string().min(1, "Current tools are required").max(500),
  urgency: z.enum(["low", "medium", "high", "urgent"]).optional(),
  volume: z.string().max(200).optional(),
  landing_path: z.string().max(500).optional(),
  experiment_assignments: z.array(experimentAssignmentSchema).max(10).optional(),
});

export type AgentRunInput = z.infer<typeof agentRunSchema>;

export const guidedAuditSchema = z.object({
  industry: auditLabelSchema("Industry", 120),
  workflow_type: auditLabelSchema("Workflow type", 120),
  bottleneck: z.string().min(20, "Describe the bottleneck in at least 20 characters").max(2000),
  current_tools: z
    .array(z.string().min(1).max(100))
    .min(1, "Select at least one tool")
    .max(10, "Too many tools selected"),
  urgency: z.enum(["low", "medium", "high", "urgent"]).optional(),
  volume: z.string().max(200).optional(),
  team_size: auditLabelSchema("Team size", 50),
  stack_maturity: auditLabelSchema("Stack maturity", 120),
  manual_steps: z.string().min(1, "Manual work detail is required").max(1500),
  handoff_breaks: z.string().min(1, "Handoff detail is required").max(1500),
  visibility_gap: z.string().min(1, "Visibility detail is required").max(1500),
  desired_outcome: z.string().min(1, "Desired outcome is required").max(1500),
  time_lost_per_week: z.enum(AUDIT_TIME_LOST).optional(),
  compliance_notes: z.string().max(500).optional(),
  landing_path: z.string().max(500).optional(),
  experiment_assignments: z.array(experimentAssignmentSchema).max(10).optional(),
});

export type GuidedAuditInput = z.infer<typeof guidedAuditSchema>;

export const sendEmailSchema = z.object({
  email: z.string().email("Valid email is required"),
  name: z.string().min(1, "Name is required").max(100),
  preview_plan: z.object({
    intake: z.object({
      suggested_scope: z.string(),
      clarified_problem: z.string(),
    }),
    workflow: z.object({
      stages: z.array(z.object({
        name: z.string(),
        owner_role: z.string(),
        exit_criteria: z.string(),
      })),
    }),
    dashboard: z.object({
      kpis: z.array(z.object({
        name: z.string(),
        definition: z.string(),
        why_it_matters: z.string(),
      })),
    }),
    automation: z.object({
      alerts: z.array(z.object({
        when: z.string(),
        who: z.string(),
        message: z.string(),
      })),
    }),
    ops_pulse: z.object({
      actions: z.array(z.object({
        priority: z.string(),
        owner_role: z.string(),
        action: z.string(),
      })),
    }),
  }),
  lead_id: z.string().min(1).max(128).optional(),
});

// --- Phase 4: Agent Chat ---

export const chatMessageSchema = z.object({
  id: z.string().min(1).max(100),
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().max(10_000),
  timestamp: z.number(),
  plan_section: z.string().optional(),
  email_capture: z.boolean().optional(),
});

export const agentChatSchema = z.object({
  message: z.string().min(1, "Message is required").max(2000),
  conversation_id: z.string().max(100).optional(),
  history: z.array(chatMessageSchema).max(30),
  phase: z.enum(["gathering", "confirming", "building", "complete", "follow_up"]),
  extracted: z.object({
    industry: z.string().max(200).optional(),
    bottleneck: z.string().max(2000).optional(),
    current_tools: z.string().max(500).optional(),
    urgency: z.enum(["low", "medium", "high", "urgent"]).optional(),
    volume: z.string().max(200).optional(),
    email: z.string().email().max(200).optional(),
    name: z.string().max(100).optional(),
  }),
  /** Plan data passed by client for follow_up phase context */
  plan: z.record(z.string(), z.unknown()).optional(),
  landing_path: z.string().max(500).optional(),
  experiment_assignments: z.array(experimentAssignmentSchema).max(10).optional(),
});

export type AgentChatInput = z.infer<typeof agentChatSchema>;

const planRefinementSectionSchema = z.enum([
  "scope",
  "workflow",
  "kpis",
  "alerts",
  "actions",
  "roadmap",
]);

export const planRefinementPreviewSchema = z.object({
  plan_id: z.string().min(1, "Plan ID is required").max(100),
  section: planRefinementSectionSchema,
  feedback: z.string().min(1, "Feedback is required").max(2000),
  edit_token: z.string().min(1).max(200).optional(),
});

export type PlanRefinementPreviewInput = z.infer<typeof planRefinementPreviewSchema>;

export const planRefinementApplySchema = z.object({
  plan_id: z.string().min(1, "Plan ID is required").max(100),
  section: planRefinementSectionSchema,
  refined_content: z.unknown(),
  feedback: z.string().max(2000).optional(),
  edit_token: z.string().min(1).max(200).optional(),
});

export type PlanRefinementApplyInput = z.infer<typeof planRefinementApplySchema>;

// --- Experiments ---

export const experimentVariantSchema = z.object({
  key: z.string().min(1, "Variant key is required").max(100),
  label: z.string().min(1, "Variant label is required").max(200),
  value: z.string().min(1, "Variant copy is required").max(5000),
  weight: z.number().int().min(0).max(100),
});

export const experimentConfigSchema = z
  .object({
    name: z.string().min(1, "Experiment name is required").max(200),
    target: z.enum(EXPERIMENT_TARGETS, {
      message: "Unsupported experiment target",
    }),
    variants: z
      .array(experimentVariantSchema)
      .min(2, "Experiments require at least two variants"),
  })
  .refine(
    (data) => data.variants.reduce((sum, v) => sum + v.weight, 0) === 100,
    { message: "Variant weights must sum to 100", path: ["variants"] }
  );

export type ExperimentConfigInput = z.infer<typeof experimentConfigSchema>;

// --- Variants ---

const landingSectionIntroSchema = z.object({
  eyebrow: z.string().max(1000),
  title: z.string().max(1000),
  description: z.string().max(5000),
});

const landingHeroSchema = z.object({
  headline: z.string().max(300),
  subheadline: z.string().max(500),
  cta_text: z.string().max(100),
  proof_line: z.string().max(500),
});

const landingHowItWorksStepSchema = z.object({
  id: z.string().max(50),
  title: z.string().max(300),
  description: z.string().max(2000),
});

const landingFeatureItemSchema = z.object({
  id: z.string().max(50),
  title: z.string().max(300),
  description: z.string().max(2000),
  visual: z.string().max(1000),
});

const landingVariantSectionsSchema = z.object({
  hero: landingHeroSchema,
  demo: landingSectionIntroSchema,
  proof: landingSectionIntroSchema.extend({
    featured_industries: z.array(z.string().max(100)).max(20),
  }),
  how_it_works: z.object({
    eyebrow: z.string().max(1000),
    title: z.string().max(1000),
    steps: z.array(landingHowItWorksStepSchema).max(20),
  }),
  features: z.object({
    eyebrow: z.string().max(1000),
    title: z.string().max(1000),
    items: z.array(landingFeatureItemSchema).max(20),
  }),
  pricing: landingSectionIntroSchema.extend({
    highlighted_tier: z.string().max(100).optional(),
  }),
  faq: landingSectionIntroSchema,
  final_cta: z.object({
    eyebrow: z.string().max(1000),
    title: z.string().max(1000),
    description: z.string().max(5000),
    cta_text: z.string().max(100),
  }),
});

export const variantSchema = z.object({
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(200)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  industry: z.string().min(1, "Industry is required").max(100),
  headline: z.string().min(1, "Headline is required").max(300),
  subheadline: z.string().min(1, "Subheadline is required").max(500),
  cta_text: z.string().min(1, "CTA text is required").max(100),
  meta_title: z.string().min(1, "Meta title is required").max(200),
  meta_description: z.string().min(1, "Meta description is required").max(500),
  featured_industries: z.array(z.string().max(100)).max(20),
  sections: landingVariantSectionsSchema.optional(),
});

export type VariantInput = z.infer<typeof variantSchema>;

// --- Agent Templates ---

export const templateUpdateSchema = z.object({
  markdown: z.string().min(1, "Template cannot be empty").max(50000),
});

// --- Lead Activity ---

export const leadNoteSchema = z.object({
  content: z.string().min(1, "Note cannot be empty").max(5000),
});

// --- Booking ---

export const bookingSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Valid email is required"),
  preferred_date: z.string().min(1, "Date is required").max(20),
  preferred_time: z.string().min(1, "Time slot is required").max(20),
  message: z.string().max(500).optional(),
});

export type BookingInput = z.infer<typeof bookingSchema>;
