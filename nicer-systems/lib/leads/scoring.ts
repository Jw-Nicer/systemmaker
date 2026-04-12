export interface LeadScoringInput {
  email?: string;
  company?: string;
  bottleneck?: string;
  urgency?: string;
  completed_agent_demo?: boolean;
  preview_plan_sent?: boolean;
  booked_call?: boolean;
  utm_source?: string;
}

// Canonical urgency values — must stay in lockstep with the
// `urgency: z.enum([...])` declarations in lib/validation.ts (leadSchema,
// agentChatSchema, guidedAuditSchema, sendEmailSchema). Any new value
// added there must also be handled here.
const URGENCY_SCORES: Record<string, number> = {
  urgent: 20,
  high: 15,
  medium: 10,
  low: 5,
};

export function computeLeadScore(lead: LeadScoringInput): number {
  let score = 0;
  const normalizedUrgency = lead.urgency?.trim().toLowerCase();

  if (lead.email) score += 10;
  if (lead.company) score += 5;
  if (lead.bottleneck && lead.bottleneck.length > 20) score += 10;

  if (normalizedUrgency && URGENCY_SCORES[normalizedUrgency] !== undefined) {
    score += URGENCY_SCORES[normalizedUrgency];
  }

  if (lead.completed_agent_demo) score += 15;
  if (lead.preview_plan_sent) score += 10;
  if (lead.booked_call) score += 15;
  if (lead.utm_source) score += 5;

  return score;
}
