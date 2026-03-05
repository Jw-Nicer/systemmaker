import { z } from "zod";

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
});

export type LeadInput = z.infer<typeof leadSchema>;

export const caseStudySchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  slug: z.string().min(1, "Slug is required").max(200),
  client_name: z.string().min(1, "Client name is required").max(100),
  industry: z.string().min(1, "Industry is required").max(100),
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
  thumbnail_url: z.string().max(500).optional(),
  is_published: z.boolean(),
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

export const offerSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  price: z.string().min(1, "Price is required").max(100),
  description: z.string().min(1, "Description is required").max(500),
  features: z.array(z.string().min(1).max(200)).min(1, "At least one feature is required"),
  cta: z.string().min(1, "CTA text is required").max(100),
  highlighted: z.boolean(),
  is_published: z.boolean(),
  sort_order: z.number().int().min(0),
});

export type OfferInput = z.infer<typeof offerSchema>;

export const eventSchema = z.object({
  event_name: z.string().min(1).max(100),
  payload: z.record(z.string(), z.unknown()).optional(),
  lead_id: z.string().uuid().optional(),
});

export const agentRunSchema = z.object({
  industry: z.string().min(1, "Industry is required").max(100),
  bottleneck: z.string().min(1, "Bottleneck description is required").max(2000),
  current_tools: z.string().min(1, "Current tools are required").max(500),
  urgency: z.enum(["low", "medium", "high", "urgent"]).optional(),
  volume: z.string().max(200).optional(),
});

export type AgentRunInput = z.infer<typeof agentRunSchema>;

export const sendEmailSchema = z.object({
  email: z.string().email("Valid email is required"),
  name: z.string().min(1, "Name is required").max(100),
});

// --- Phase 4: Agent Chat ---

export const chatMessageSchema = z.object({
  message: z.string().min(1, "Message is required").max(2000),
});

export type ChatMessageInput = z.infer<typeof chatMessageSchema>;

export const agentChatSchema = z.object({
  message: z.string().min(1, "Message is required").max(2000),
  conversation_id: z.string().max(100).optional(),
  history: z
    .array(
      z.object({
        id: z.string(),
        role: z.enum(["user", "assistant", "system"]),
        content: z.string().max(10000),
        timestamp: z.number(),
        plan_section: z
          .enum(["intake", "workflow", "automation", "dashboard", "ops_pulse"])
          .optional(),
        email_capture: z.boolean().optional(),
      })
    )
    .max(50),
  phase: z.enum(["gathering", "confirming", "building", "complete", "follow_up"]),
  extracted: z.object({
    industry: z.string().max(100).optional(),
    bottleneck: z.string().max(2000).optional(),
    current_tools: z.string().max(500).optional(),
    urgency: z.enum(["low", "medium", "high", "urgent"]).optional(),
    volume: z.string().max(200).optional(),
  }),
});

export type AgentChatInput = z.infer<typeof agentChatSchema>;

export const planRefinementSchema = z.object({
  plan_id: z.string().min(1, "Plan ID is required").max(100),
  section: z.enum(["intake", "workflow", "automation", "dashboard", "ops_pulse"]),
  feedback: z.string().min(1, "Feedback is required").max(2000),
});

export type PlanRefinementInput = z.infer<typeof planRefinementSchema>;
