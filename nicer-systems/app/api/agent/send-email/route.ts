import { NextResponse } from "next/server";
import { Resend } from "resend";
import { sendEmailSchema } from "@/lib/validation";
import { getAdminDb } from "@/lib/firebase/admin";
import type { PreviewPlan } from "@/types/preview-plan";
import { renderPreviewPlanHTML } from "@/lib/agents/email-template";
import { computeLeadScore } from "@/lib/leads/scoring";
import { sendAdminNotification } from "@/lib/email/admin-notification";
import { enrollInNurture } from "@/lib/email/nurture-sequence";
import {
  enforceRateLimit,
  hasFilledHoneypot,
} from "@/lib/security/request-guards";

export async function POST(request: Request) {
  try {
    const limited = await enforceRateLimit(request, {
      keyPrefix: "send_email",
      windowMs: 60_000,
      maxRequests: 3,
    });
    if (limited) return limited;

    const body = await request.json();
    if (hasFilledHoneypot(body)) {
      return NextResponse.json({ error: "Validation failed" }, { status: 400 });
    }

    const parsed = sendEmailSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const preview_plan = parsed.data.preview_plan as unknown as PreviewPlan;
    const lead_id = parsed.data.lead_id;

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Email service not configured" },
        { status: 500 }
      );
    }

    const resend = new Resend(apiKey);
    const html = renderPreviewPlanHTML(preview_plan, parsed.data.name);

    await resend.emails.send({
      from: "Nicer Systems <onboarding@resend.dev>",
      to: parsed.data.email,
      subject: "Your Preview Plan from Nicer Systems",
      html,
    });

    // Validate lead_id before using it — must exist and be from agent_demo
    if (lead_id && typeof lead_id === "string" && lead_id.length < 128) {
      const db = getAdminDb();
      const leadDoc = await db.collection("leads").doc(lead_id).get();
      const leadData = leadDoc.data();

      if (!leadDoc.exists || !leadData || leadData.source !== "agent_demo") {
        // Still return success (email was sent), just skip lead update
        return NextResponse.json({ success: true }, { status: 200 });
      }

      const score = computeLeadScore({
        email: parsed.data.email,
        company: leadData.company,
        bottleneck: leadData.bottleneck,
        urgency: leadData.urgency,
        completed_agent_demo: true,
        preview_plan_sent: true,
        utm_source: leadData.utm_source,
      });

      await db.collection("leads").doc(lead_id).update({
        name: parsed.data.name,
        email: parsed.data.email,
        score,
        preview_plan_sent_at: new Date(),
        updated_at: new Date(),
      });

      // Log email activity on the lead
      db.collection("leads").doc(lead_id).collection("activity").add({
        type: "email_sent",
        content: "Preview Plan sent",
        created_at: new Date(),
      }).catch(() => {});

      // Fire-and-forget: admin notification + nurture enrollment
      sendAdminNotification({
        name: parsed.data.name,
        email: parsed.data.email,
        company: leadData.company,
        industry: leadData.industry,
        bottleneck: leadData.bottleneck,
        score,
        source: "agent_demo",
      }).catch(() => {});

      enrollInNurture({
        lead_id,
        name: parsed.data.name,
        email: parsed.data.email,
        industry: leadData.industry,
        bottleneck: leadData.bottleneck,
      }).catch(() => {});
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("Send email error:", err);
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    );
  }
}
