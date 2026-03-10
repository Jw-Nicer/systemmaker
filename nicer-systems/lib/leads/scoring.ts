export interface LeadScoringInput {
  email?: string;
  company?: string;
  bottleneck?: string;
  urgency?: string;
  completed_agent_demo?: boolean;
  preview_plan_sent?: boolean;
  utm_source?: string;
}

export function computeLeadScore(lead: LeadScoringInput): number {
  let score = 0;

  if (lead.email) score += 10;
  if (lead.company) score += 5;
  if (lead.bottleneck && lead.bottleneck.length > 20) score += 10;

  switch (lead.urgency?.toLowerCase()) {
    case "urgent":
      score += 20;
      break;
    case "high":
      score += 15;
      break;
    case "medium":
      score += 10;
      break;
    case "low":
      score += 5;
      break;
  }

  if (lead.completed_agent_demo) score += 15;
  if (lead.preview_plan_sent) score += 10;
  if (lead.utm_source) score += 5;

  return score;
}
