import type { PreviewPlan } from "@/types/preview-plan";

/**
 * Convert a PreviewPlan to clean markdown for export.
 */
export function planToMarkdown(plan: PreviewPlan): string {
  const lines: string[] = [];

  lines.push("# Preview Plan — Nicer Systems\n");

  // Executive Summary
  const es = plan.ops_pulse.executive_summary;
  if (es?.problem) {
    lines.push("## Executive Summary\n");
    lines.push(`**Problem:** ${es.problem}\n`);
    lines.push(`**Solution:** ${es.solution}\n`);
    lines.push(`**Expected Impact:** ${es.impact}\n`);
    lines.push(`**Next Step:** ${es.next_step}\n`);
  }

  // Suggested Scope
  lines.push("## Suggested Scope\n");
  lines.push(`**${plan.intake.suggested_scope}**\n`);
  lines.push(`${plan.intake.clarified_problem}\n`);
  if (plan.intake.assumptions.length > 0) {
    lines.push("**Assumptions:**\n");
    for (const a of plan.intake.assumptions) lines.push(`- ${a}`);
    lines.push("");
  }
  if (plan.intake.constraints.length > 0) {
    lines.push("**Constraints:**\n");
    for (const c of plan.intake.constraints) lines.push(`- ${c}`);
    lines.push("");
  }

  // Workflow Map
  lines.push(`## Workflow Map (${plan.workflow.stages.length} stages)\n`);
  lines.push("| # | Stage | Owner | Entry Criteria | Exit Criteria |");
  lines.push("|---|-------|-------|----------------|---------------|");
  for (let i = 0; i < plan.workflow.stages.length; i++) {
    const s = plan.workflow.stages[i];
    lines.push(`| ${i + 1} | ${s.name} | ${s.owner_role} | ${s.entry_criteria} | ${s.exit_criteria} |`);
  }
  lines.push("");
  if (plan.workflow.failure_modes.length > 0) {
    lines.push("**Failure Modes:**\n");
    for (const f of plan.workflow.failure_modes) lines.push(`- ${f}`);
    lines.push("");
  }

  // Dashboard KPIs
  lines.push(`## Dashboard KPIs (${plan.dashboard.kpis.length})\n`);
  for (const k of plan.dashboard.kpis) {
    lines.push(`### ${k.name}\n`);
    lines.push(`${k.definition}\n`);
    lines.push(`*${k.why_it_matters}*\n`);
  }

  // Automations & Alerts
  lines.push("## Automations & Alerts\n");
  if (plan.automation.automations.length > 0) {
    lines.push("### Automations\n");
    for (const a of plan.automation.automations) {
      const platformTag = a.platform ? ` [${a.platform}]` : "";
      lines.push(`**${a.trigger}**${platformTag}\n`);
      for (let j = 0; j < a.steps.length; j++) {
        lines.push(`${j + 1}. ${a.steps[j]}`);
      }
      lines.push("");
    }
  }
  if (plan.automation.alerts.length > 0) {
    lines.push("### Alerts\n");
    for (const a of plan.automation.alerts) {
      lines.push(`- **${a.when}** → notify *${a.who}*: "${a.message}"`);
    }
    lines.push("");
  }

  // Ops Pulse & Actions
  lines.push("## Ops Pulse & Actions\n");
  for (const section of plan.ops_pulse.sections) {
    lines.push(`### ${section.title}\n`);
    for (const b of section.bullets) lines.push(`- ${b}`);
    lines.push("");
  }
  if (plan.ops_pulse.actions.length > 0) {
    lines.push("### Recommended Actions\n");
    lines.push("| Priority | Owner | Action |");
    lines.push("|----------|-------|--------|");
    for (const a of plan.ops_pulse.actions) {
      lines.push(`| ${a.priority} | ${a.owner_role} | ${a.action} |`);
    }
    lines.push("");
  }
  if (plan.ops_pulse.questions.length > 0) {
    lines.push("### Questions to Explore\n");
    for (const q of plan.ops_pulse.questions) lines.push(`- ${q}`);
    lines.push("");
  }

  // Implementation Roadmap
  if (plan.roadmap && plan.roadmap.phases.length > 0) {
    lines.push(`## Implementation Roadmap (${plan.roadmap.total_estimated_weeks} weeks)\n`);
    for (const phase of plan.roadmap.phases) {
      lines.push(`### Week ${phase.week}: ${phase.title}\n`);
      for (const t of phase.tasks) {
        lines.push(`- [${t.effort}] **${t.owner_role}:** ${t.task}`);
      }
      if (phase.quick_wins.length > 0) {
        lines.push(`\n**Quick Wins:** ${phase.quick_wins.join("; ")}`);
      }
      if (phase.risks.length > 0) {
        lines.push(`\n**Risks:** ${phase.risks.join("; ")}`);
      }
      lines.push("");
    }
    lines.push(`**Critical Path:** ${plan.roadmap.critical_path}\n`);
  }

  // Executive Proposal
  if (plan.proposal) {
    lines.push("## Executive Proposal\n");
    if (plan.proposal.executive_pitch) {
      lines.push(`${plan.proposal.executive_pitch}\n`);
    }
    if (plan.proposal.value_propositions?.length > 0) {
      lines.push("### Value Propositions\n");
      for (const vp of plan.proposal.value_propositions) {
        lines.push(`- **${vp.claim}** — ${vp.evidence} *(${vp.metric})*`);
      }
      lines.push("");
    }
    if (plan.proposal.risk_of_inaction?.length > 0) {
      lines.push("### Risk of Inaction\n");
      for (const risk of plan.proposal.risk_of_inaction) {
        lines.push(`- ${risk}`);
      }
      lines.push("");
    }
    if (plan.proposal.recommended_engagement) {
      lines.push(`### Recommended Engagement\n\n${plan.proposal.recommended_engagement}\n`);
    }
    if (plan.proposal.estimated_roi) {
      lines.push(`### Estimated ROI\n\n${plan.proposal.estimated_roi}\n`);
    }
  }

  // Disclaimer
  lines.push("---\n");
  lines.push("*This is a draft preview — not a final recommendation. Assumptions may not match your exact setup.*\n");
  lines.push("*Generated by [Nicer Systems](https://nicersystems.com) — Tell us the problem. We'll build the system.*");

  return lines.join("\n");
}
