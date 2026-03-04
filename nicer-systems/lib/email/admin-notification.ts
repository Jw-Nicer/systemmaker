import { Resend } from "resend";

interface AdminNotificationInput {
  name: string;
  email: string;
  company?: string;
  industry?: string;
  bottleneck?: string;
  score: number;
  source: "contact" | "agent_demo";
}

function renderAdminNotificationHTML(lead: AdminNotificationInput): string {
  const scoreColor =
    lead.score >= 50 ? "#16a34a" : lead.score >= 25 ? "#ca8a04" : "#dc2626";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111827;line-height:1.6;">
  <h2 style="color:#00d4ff;margin:0 0 16px;">New Lead: ${lead.name}</h2>

  <table style="width:100%;font-size:14px;border-collapse:collapse;">
    <tr>
      <td style="padding:6px 0;color:#6b7280;width:120px;">Email</td>
      <td style="padding:6px 0;"><a href="mailto:${lead.email}">${lead.email}</a></td>
    </tr>
    <tr>
      <td style="padding:6px 0;color:#6b7280;">Company</td>
      <td style="padding:6px 0;">${lead.company || "—"}</td>
    </tr>
    <tr>
      <td style="padding:6px 0;color:#6b7280;">Industry</td>
      <td style="padding:6px 0;">${lead.industry || "—"}</td>
    </tr>
    <tr>
      <td style="padding:6px 0;color:#6b7280;">Bottleneck</td>
      <td style="padding:6px 0;">${lead.bottleneck || "—"}</td>
    </tr>
    <tr>
      <td style="padding:6px 0;color:#6b7280;">Source</td>
      <td style="padding:6px 0;">${lead.source === "agent_demo" ? "Agent Demo" : "Contact Form"}</td>
    </tr>
    <tr>
      <td style="padding:6px 0;color:#6b7280;">Score</td>
      <td style="padding:6px 0;"><strong style="color:${scoreColor};">${lead.score}/75</strong></td>
    </tr>
  </table>

  <div style="margin-top:20px;text-align:center;">
    <a href="https://nicer-systems.web.app/admin/leads" style="background:#00d4ff;color:#0a0e1a;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;font-size:14px;">
      View in Dashboard
    </a>
  </div>

  <p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:24px;">
    Nicer Systems — Automated lead notification
  </p>
</body>
</html>`;
}

export async function sendAdminNotification(
  lead: AdminNotificationInput
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("RESEND_API_KEY not set — skipping admin notification");
    return;
  }

  const adminEmail =
    process.env.ADMIN_EMAIL || "johnwilnicer@gmail.com";

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: "Nicer Systems <onboarding@resend.dev>",
      to: adminEmail,
      subject: `New ${lead.source === "agent_demo" ? "Agent Demo" : "Contact"} Lead: ${lead.name} (Score: ${lead.score})`,
      html: renderAdminNotificationHTML(lead),
    });
  } catch (err) {
    console.error("Admin notification failed:", err);
  }
}
