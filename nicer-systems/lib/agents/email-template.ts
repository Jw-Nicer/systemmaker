import type { PreviewPlan } from "@/types/preview-plan";
import { buildUnsubscribeUrl } from "@/lib/email/unsubscribe-token";

/** Escape HTML special characters to prevent XSS in email content. */
function esc(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderPreviewPlanHTML(
  plan: PreviewPlan,
  recipientName: string,
  leadId?: string
): string {
  const unsubscribeUrl = leadId ? buildUnsubscribeUrl(leadId) : null;
  const stagesHTML = plan.workflow.stages
    .map(
      (s, i) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280;">${i + 1}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-weight:600;">${esc(s.name)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280;">${esc(s.owner_role)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:13px;">${esc(s.exit_criteria)}</td>
      </tr>`
    )
    .join("");

  const kpisHTML = plan.dashboard.kpis
    .map(
      (k) => `
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:8px;">
        <strong style="color:#111827;">${esc(k.name)}</strong>
        <p style="margin:4px 0 0;color:#6b7280;font-size:14px;">${esc(k.definition)}</p>
        <p style="margin:4px 0 0;color:#9ca3af;font-size:13px;font-style:italic;">${esc(k.why_it_matters)}</p>
      </div>`
    )
    .join("");

  const alertsHTML = plan.automation.alerts
    .map(
      (a) => `
      <li style="margin-bottom:8px;">
        <strong>${esc(a.when)}</strong> → notify <em>${esc(a.who)}</em>: &ldquo;${esc(a.message)}&rdquo;
      </li>`
    )
    .join("");

  const roadmapHTML = plan.roadmap?.phases
    .map(
      (p) => `
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:12px;">
        <p style="margin:0 0 8px;"><strong style="color:#00d4ff;">Week ${p.week}:</strong> <strong>${esc(p.title)}</strong></p>
        <ul style="margin:0;padding-left:20px;color:#374151;font-size:14px;">
          ${p.tasks
            .map(
              (t) =>
                `<li style="margin-bottom:4px;"><span style="background:${t.effort === "large" ? "#fef2f2" : t.effort === "medium" ? "#fffbeb" : "#f0fdf4"};color:${t.effort === "large" ? "#dc2626" : t.effort === "medium" ? "#d97706" : "#16a34a"};padding:1px 6px;border-radius:8px;font-size:11px;">${esc(t.effort)}</span> ${esc(t.task)} <span style="color:#6b7280;font-size:13px;">(${esc(t.owner_role)})</span></li>`
            )
            .join("")}
        </ul>
        ${p.quick_wins.length > 0 ? `<p style="margin:8px 0 0;font-size:13px;color:#16a34a;">Quick wins: ${p.quick_wins.map((w) => esc(w)).join("; ")}</p>` : ""}
      </div>`
    )
    .join("") ?? "";

  const actionsHTML = plan.ops_pulse.actions
    .map(
      (a) => `
      <tr>
        <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;">
          <span style="background:${a.priority === "high" ? "#fef2f2" : "#f0fdf4"};color:${a.priority === "high" ? "#dc2626" : "#16a34a"};padding:2px 8px;border-radius:12px;font-size:12px;">${esc(a.priority)}</span>
        </td>
        <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280;">${esc(a.owner_role)}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;">${esc(a.action)}</td>
      </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:640px;margin:0 auto;padding:24px;color:#111827;line-height:1.6;">
  <div style="text-align:center;margin-bottom:32px;">
    <h1 style="color:#00d4ff;margin:0;">Nicer Systems</h1>
    <p style="color:#6b7280;margin:4px 0 0;">Your Preview Plan</p>
  </div>

  <p>Hi ${esc(recipientName)},</p>
  <p>Here's the draft preview plan based on your bottleneck description. This is a starting point — not a final recommendation.</p>

  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">

  <!-- Executive Summary -->
  ${plan.ops_pulse.executive_summary?.problem ? `
  <div style="background:#f0fdfa;border:2px solid #00d4ff33;border-radius:12px;padding:20px;margin-bottom:24px;">
    <p style="color:#00d4ff;font-size:12px;text-transform:uppercase;letter-spacing:1px;font-weight:600;margin:0 0 12px;">Executive Summary</p>
    <p style="margin:0 0 8px;"><strong>Problem:</strong> ${esc(plan.ops_pulse.executive_summary.problem)}</p>
    <p style="margin:0 0 8px;"><strong>Solution:</strong> ${esc(plan.ops_pulse.executive_summary.solution)}</p>
    <p style="margin:0 0 8px;"><strong>Expected Impact:</strong> ${esc(plan.ops_pulse.executive_summary.impact)}</p>
    <p style="margin:0;color:#00d4ff;"><strong>Next Step:</strong> ${esc(plan.ops_pulse.executive_summary.next_step)}</p>
  </div>
  ` : ''}

  <!-- Scope -->
  <h2 style="color:#00d4ff;font-size:18px;">Suggested Scope</h2>
  <p><strong>${esc(plan.intake.suggested_scope)}</strong></p>
  <p style="color:#6b7280;">${esc(plan.intake.clarified_problem)}</p>

  <!-- Workflow Map -->
  <h2 style="color:#00d4ff;font-size:18px;">Workflow Map</h2>
  <table style="width:100%;border-collapse:collapse;font-size:14px;">
    <thead>
      <tr style="background:#f9fafb;">
        <th style="padding:8px 12px;text-align:left;color:#6b7280;">#</th>
        <th style="padding:8px 12px;text-align:left;color:#6b7280;">Stage</th>
        <th style="padding:8px 12px;text-align:left;color:#6b7280;">Owner</th>
        <th style="padding:8px 12px;text-align:left;color:#6b7280;">Exit Criteria</th>
      </tr>
    </thead>
    <tbody>${stagesHTML}</tbody>
  </table>

  <!-- KPIs -->
  <h2 style="color:#00d4ff;font-size:18px;margin-top:24px;">Dashboard KPIs</h2>
  ${kpisHTML}

  <!-- Alerts -->
  <h2 style="color:#00d4ff;font-size:18px;">Automated Alerts</h2>
  <ul style="padding-left:20px;color:#374151;font-size:14px;">${alertsHTML}</ul>

  <!-- Actions -->
  <h2 style="color:#00d4ff;font-size:18px;">Recommended Actions</h2>
  <table style="width:100%;border-collapse:collapse;font-size:14px;">
    <thead>
      <tr style="background:#f9fafb;">
        <th style="padding:6px 12px;text-align:left;color:#6b7280;">Priority</th>
        <th style="padding:6px 12px;text-align:left;color:#6b7280;">Owner</th>
        <th style="padding:6px 12px;text-align:left;color:#6b7280;">Action</th>
      </tr>
    </thead>
    <tbody>${actionsHTML}</tbody>
  </table>

  ${plan.roadmap ? `
  <!-- Roadmap -->
  <h2 style="color:#00d4ff;font-size:18px;margin-top:24px;">Implementation Roadmap</h2>
  <p style="color:#6b7280;font-size:14px;margin-bottom:12px;">Estimated timeline: <strong>${plan.roadmap.total_estimated_weeks} weeks</strong></p>
  ${roadmapHTML}
  <div style="background:#f0fdfa;border:1px solid #00d4ff33;border-radius:8px;padding:12px;margin-top:8px;">
    <p style="margin:0;font-size:13px;color:#6b7280;"><strong style="color:#00d4ff;">Critical Path:</strong> ${esc(plan.roadmap.critical_path)}</p>
  </div>
  ` : ''}

  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">

  <p style="color:#6b7280;font-size:13px;font-style:italic;">
    This is a draft preview — not a final recommendation. Assumptions may not match your exact setup.
  </p>

  <div style="text-align:center;margin:32px 0;">
    <a href="https://nicersystems.com/contact" style="background:#00d4ff;color:#0a0e1a;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;">
      Book a Scoping Call
    </a>
  </div>

  <p style="color:#9ca3af;font-size:12px;text-align:center;">
    Nicer Systems — Tell us the problem. We'll build the system.
  </p>

  ${unsubscribeUrl ? `
  <p style="color:#9ca3af;font-size:11px;text-align:center;margin-top:16px;">
    <a href="${unsubscribeUrl}" style="color:#9ca3af;text-decoration:underline;">Unsubscribe</a> from future emails.
  </p>
  ` : ''}
</body>
</html>`;
}
