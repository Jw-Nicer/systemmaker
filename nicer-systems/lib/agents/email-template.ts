import type { PreviewPlan } from "@/types/preview-plan";

export function renderPreviewPlanHTML(
  plan: PreviewPlan,
  recipientName: string
): string {
  const stagesHTML = plan.workflow.stages
    .map(
      (s, i) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280;">${i + 1}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-weight:600;">${s.name}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280;">${s.owner_role}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:13px;">${s.exit_criteria}</td>
      </tr>`
    )
    .join("");

  const kpisHTML = plan.dashboard.kpis
    .map(
      (k) => `
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:8px;">
        <strong style="color:#111827;">${k.name}</strong>
        <p style="margin:4px 0 0;color:#6b7280;font-size:14px;">${k.definition}</p>
        <p style="margin:4px 0 0;color:#9ca3af;font-size:13px;font-style:italic;">${k.why_it_matters}</p>
      </div>`
    )
    .join("");

  const alertsHTML = plan.automation.alerts
    .map(
      (a) => `
      <li style="margin-bottom:8px;">
        <strong>${a.when}</strong> → notify <em>${a.who}</em>: "${a.message}"
      </li>`
    )
    .join("");

  const actionsHTML = plan.ops_pulse.actions
    .map(
      (a) => `
      <tr>
        <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;">
          <span style="background:${a.priority === "high" ? "#fef2f2" : "#f0fdf4"};color:${a.priority === "high" ? "#dc2626" : "#16a34a"};padding:2px 8px;border-radius:12px;font-size:12px;">${a.priority}</span>
        </td>
        <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280;">${a.owner_role}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;">${a.action}</td>
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

  <p>Hi ${recipientName},</p>
  <p>Here's the draft preview plan based on your bottleneck description. This is a starting point — not a final recommendation.</p>

  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">

  <!-- Scope -->
  <h2 style="color:#00d4ff;font-size:18px;">Suggested Scope</h2>
  <p><strong>${plan.intake.suggested_scope}</strong></p>
  <p style="color:#6b7280;">${plan.intake.clarified_problem}</p>

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
</body>
</html>`;
}
