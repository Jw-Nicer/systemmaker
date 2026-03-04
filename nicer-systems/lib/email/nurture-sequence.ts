import { Resend } from "resend";
import { getAdminDb } from "@/lib/firebase/admin";
import {
  renderQuickTipEmail,
  renderCaseStudyEmail,
  renderROIEmail,
  renderFinalCTAEmail,
} from "./nurture-templates";

interface NurtureEnrollInput {
  lead_id: string;
  name: string;
  email: string;
  industry?: string;
  bottleneck?: string;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export async function enrollInNurture(
  input: NurtureEnrollInput
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("RESEND_API_KEY not set — skipping nurture enrollment");
    return;
  }

  const ctx = {
    name: input.name,
    industry: input.industry,
    bottleneck: input.bottleneck,
  };

  const now = new Date();
  const emails = [
    { ...renderQuickTipEmail(ctx), scheduledAt: addDays(now, 2) },
    { ...renderCaseStudyEmail(ctx), scheduledAt: addDays(now, 4) },
    { ...renderROIEmail(ctx), scheduledAt: addDays(now, 7) },
    { ...renderFinalCTAEmail(ctx), scheduledAt: addDays(now, 14) },
  ];

  const resend = new Resend(apiKey);

  const results = await Promise.allSettled(
    emails.map((e) =>
      resend.emails.send({
        from: "Nicer Systems <onboarding@resend.dev>",
        to: input.email,
        subject: e.subject,
        html: e.html,
        scheduledAt: e.scheduledAt.toISOString(),
      })
    )
  );

  const failed = results.filter((r) => r.status === "rejected");
  if (failed.length > 0) {
    console.error(
      `${failed.length}/${emails.length} nurture emails failed to schedule`
    );
  }

  try {
    const db = getAdminDb();
    await db.collection("leads").doc(input.lead_id).update({
      nurture_enrolled: true,
      nurture_enrolled_at: new Date(),
    });
  } catch (err) {
    console.error("Failed to update nurture status on lead:", err);
  }
}
