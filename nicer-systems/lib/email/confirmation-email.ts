import { Resend } from "resend";

interface ConfirmationEmailInput {
  name: string;
  email: string;
  bottleneck?: string;
  plan_id?: string;
}

function renderConfirmationHTML(input: ConfirmationEmailInput): string {
  const firstName = input.name.split(" ")[0];
  const bottleneckSummary = input.bottleneck
    ? `<p style="margin:12px 0;padding:12px 16px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;font-size:14px;color:#374151;"><strong>What you told us:</strong> ${input.bottleneck.slice(0, 200)}</p>`
    : "";

  const planLink = input.plan_id
    ? `<p style="margin:16px 0;"><a href="https://nicer-systems.web.app/plan/${input.plan_id}" style="color:#00d4ff;font-weight:600;">View your Preview Plan →</a></p>`
    : "";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111827;line-height:1.6;">
  <div style="text-align:center;margin-bottom:24px;">
    <h1 style="color:#00d4ff;margin:0;font-size:20px;">Nicer Systems</h1>
  </div>
  <p>Hi ${firstName},</p>
  <p>Thanks for reaching out. We've received your details and here's what happens next:</p>
  ${bottleneckSummary}
  <ol style="color:#374151;padding-left:20px;">
    <li style="margin-bottom:8px;">We'll review your submission within 24 hours</li>
    <li style="margin-bottom:8px;">If it's a fit, we'll send a calendar link for a 45-minute scoping call</li>
    <li style="margin-bottom:8px;">On the call: we'll map one workflow end-to-end and define deliverables</li>
  </ol>
  ${planLink}
  <p style="margin-top:20px;color:#6b7280;font-size:14px;">Reply to this email if you have questions.</p>
  <p>— The Nicer Systems Team</p>
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
  <p style="color:#9ca3af;font-size:12px;text-align:center;">
    Nicer Systems — Tell us the problem. We'll build the system.<br>
    <a href="https://nicer-systems.web.app" style="color:#9ca3af;">nicersystems.com</a>
  </p>
</body>
</html>`;
}

export async function sendConfirmationEmail(
  input: ConfirmationEmailInput
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("RESEND_API_KEY not set — skipping confirmation email");
    return;
  }

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: "Nicer Systems <onboarding@resend.dev>",
      to: input.email,
      subject: "We got your details — here's what happens next",
      html: renderConfirmationHTML(input),
    });
  } catch (err) {
    console.error("Confirmation email failed:", err);
  }
}
