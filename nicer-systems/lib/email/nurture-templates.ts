interface NurtureContext {
  name: string;
  industry?: string;
  bottleneck?: string;
}

function wrapper(content: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111827;line-height:1.6;">
  <div style="text-align:center;margin-bottom:24px;">
    <h1 style="color:#00d4ff;margin:0;font-size:20px;">Nicer Systems</h1>
  </div>
  ${content}
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
  <p style="color:#9ca3af;font-size:12px;text-align:center;">
    Nicer Systems — Tell us the problem. We'll build the system.<br>
    <a href="https://nicer-systems.web.app" style="color:#9ca3af;">nicersystems.com</a>
  </p>
</body>
</html>`;
}

export function renderQuickTipEmail(ctx: NurtureContext): {
  subject: string;
  html: string;
} {
  const bottleneckRef = ctx.bottleneck
    ? `your ${ctx.bottleneck.toLowerCase().slice(0, 60)} challenge`
    : "your workflow challenges";

  return {
    subject: `A quick automation tip for ${ctx.name.split(" ")[0]}`,
    html: wrapper(`
      <p>Hi ${ctx.name.split(" ")[0]},</p>
      <p>One pattern we see with ${bottleneckRef}: the biggest wins come from automating the <em>handoffs</em>, not the tasks themselves.</p>
      <p>Most bottlenecks happen when work moves between people or systems. A simple trigger — "when X is done, notify Y and create Z" — can cut turnaround by 40-60%.</p>
      <p><strong>Try this today:</strong> Pick the one handoff in your process that causes the most delays. What would happen if it were instant?</p>
      <p>That's usually where we start a build.</p>
      <div style="text-align:center;margin:24px 0;">
        <a href="https://nicer-systems.web.app/contact" style="background:#00d4ff;color:#0a0e1a;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;font-size:14px;">
          Tell Us About That Handoff
        </a>
      </div>
      <p>— The Nicer Systems Team</p>
    `),
  };
}

export function renderCaseStudyEmail(ctx: NurtureContext): {
  subject: string;
  html: string;
} {
  const industryRef = ctx.industry
    ? `in ${ctx.industry}`
    : "like yours";

  return {
    subject: `How a team ${industryRef} cut manual work by 70%`,
    html: wrapper(`
      <p>Hi ${ctx.name.split(" ")[0]},</p>
      <p>Wanted to share a quick story from a team ${industryRef}.</p>
      <p>They were spending 15+ hours/week on manual data entry, status updates, and report generation. The kind of work that feels small in the moment but adds up fast.</p>
      <p>We built them a system that:</p>
      <ul style="color:#374151;">
        <li>Auto-captures intake data from forms and emails</li>
        <li>Routes work to the right person with one-click approval</li>
        <li>Generates weekly reports without anyone touching a spreadsheet</li>
      </ul>
      <p><strong>Result:</strong> 70% less manual work, 2-day faster turnaround, and the ops lead finally stopped working weekends.</p>
      <div style="text-align:center;margin:24px 0;">
        <a href="https://nicer-systems.web.app/case-studies" style="background:#00d4ff;color:#0a0e1a;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;font-size:14px;">
          See More Case Studies
        </a>
      </div>
      <p>— The Nicer Systems Team</p>
    `),
  };
}

export function renderROIEmail(ctx: NurtureContext): {
  subject: string;
  html: string;
} {
  return {
    subject: `The math on automation (it's simpler than you think)`,
    html: wrapper(`
      <p>Hi ${ctx.name.split(" ")[0]},</p>
      <p>Here's a quick back-of-napkin calculation we use with clients:</p>
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:16px 0;">
        <p style="margin:0;"><strong>Hours saved per week:</strong> 10-20 hrs (typical for a 5-person ops team)</p>
        <p style="margin:8px 0 0;"><strong>Loaded cost per hour:</strong> $35-50</p>
        <p style="margin:8px 0 0;"><strong>Annual savings:</strong> $18,000 - $52,000</p>
        <p style="margin:8px 0 0;"><strong>Typical build cost:</strong> $3,000 - $8,000</p>
        <p style="margin:12px 0 0;color:#16a34a;font-weight:600;">ROI payback: 1-3 months</p>
      </div>
      <p>And that's just the direct labor savings. The real value is in faster turnaround, fewer errors, and your team focusing on work that actually grows the business.</p>
      <p>Your Preview Plan already outlined the specific automations that apply to your workflow. Want to turn it into a real build?</p>
      <div style="text-align:center;margin:24px 0;">
        <a href="https://nicer-systems.web.app/contact" style="background:#00d4ff;color:#0a0e1a;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;font-size:14px;">
          Book a Scoping Call
        </a>
      </div>
      <p>— The Nicer Systems Team</p>
    `),
  };
}

export function renderFinalCTAEmail(ctx: NurtureContext): {
  subject: string;
  html: string;
} {
  return {
    subject: `Last thing — your Preview Plan is still here`,
    html: wrapper(`
      <p>Hi ${ctx.name.split(" ")[0]},</p>
      <p>Just a quick note — your Preview Plan is still ready to go whenever you are.</p>
      <p>If the timing wasn't right before, no worries. But if you're still dealing with the same bottleneck, we'd love to help you move forward.</p>
      <p>A 20-minute scoping call is all it takes to turn your Preview Plan into a concrete build proposal. No commitment, no pressure.</p>
      <div style="text-align:center;margin:24px 0;">
        <a href="https://nicer-systems.web.app/contact" style="background:#00d4ff;color:#0a0e1a;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;font-size:14px;">
          Book a Scoping Call
        </a>
      </div>
      <p>Either way, thanks for checking us out. We're here when you need us.</p>
      <p>— The Nicer Systems Team</p>
    `),
  };
}
