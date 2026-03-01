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

// --- Phase 3 schemas ---

export const industryPageSchema = z.object({
  slug: z.string().min(1, "Slug is required").max(200),
  industry_name: z.string().min(1, "Industry name is required").max(100),
  hero_headline: z.string().min(1, "Headline is required").max(300),
  hero_subheadline: z.string().min(1, "Subheadline is required").max(500),
  pain_points: z.array(z.string().min(1).max(300)).min(1, "At least one pain point"),
  cta_primary_text: z.string().min(1).max(100),
  cta_secondary_text: z.string().min(1).max(100),
  meta_title: z.string().min(1).max(200),
  meta_description: z.string().min(1).max(500),
  is_published: z.boolean(),
  sort_order: z.number().int().min(0),
});

export type IndustryPageInput = z.infer<typeof industryPageSchema>;

export const abTestVariantSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, "Variant name is required").max(100),
  headline: z.string().max(300),
  subheadline: z.string().max(500),
  cta_text: z.string().max(100),
  weight: z.number().int().min(0).max(100),
});

export const abTestSchema = z.object({
  name: z.string().min(1, "Test name is required").max(200),
  target_page: z.string().min(1, "Target page is required").max(200),
  element: z.string().min(1, "Element is required").max(100),
  variants: z.array(abTestVariantSchema).min(2, "At least two variants"),
  is_active: z.boolean(),
});

export type ABTestInput = z.infer<typeof abTestSchema>;

export const emailStepSchema = z.object({
  delay_days: z.number().int().min(0).max(90),
  subject: z.string().min(1, "Subject is required").max(200),
  body_html: z.string().min(1, "Body is required").max(50000),
});

export const emailSequenceSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  trigger: z.enum(["lead_submit", "preview_plan_sent"]),
  steps: z.array(emailStepSchema).min(1, "At least one step"),
  is_active: z.boolean(),
});

export type EmailSequenceInput = z.infer<typeof emailSequenceSchema>;
