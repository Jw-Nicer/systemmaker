import { NextResponse } from "next/server";
import { Resend } from "resend";
import { sendEmailSchema } from "@/lib/validation";
import { getAdminDb } from "@/lib/firebase/admin";
import type { PreviewPlan } from "@/types/preview-plan";
import { renderPreviewPlanHTML } from "@/lib/agents/email-template";
import { computeLeadScore } from "@/lib/leads/scoring";
import { findLeadByEmail, normalizeEmail } from "@/lib/leads/dedup";
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

    const preview_plan = parsed.data.preview_plan as PreviewPlan;
    const lead_id = parsed.data.lead_id;

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Email service not configured" },
        { status: 500 }
      );
    }

    const resend = new Resend(apiKey);
    const html = renderPreviewPlanHTML(preview_plan, parsed.data.name, lead_id);

    await resend.emails.send({
      from: "Nicer Systems <onboarding@resend.dev>",
      to: parsed.data.email,
      subject: "Your Preview Plan from Nicer Systems",
      html,
    });

    // Validate lead_id before using it — must exist and match a supported agent lead source
    const validLeadId = lead_id
      && typeof lead_id === "string"
      && lead_id.length < 128
      && /^[a-zA-Z0-9_-]+$/.test(lead_id);

    if (validLeadId) {
      const db = getAdminDb();
      const leadDoc = await db.collection("leads").doc(lead_id).get();
      const leadData = leadDoc.data();

      if (!leadDoc.exists || !leadData || !["agent_demo", "agent_chat", "guided_audit"].includes(leadData.source)) {
        // Always return success (blind response) — email was already sent
        return NextResponse.json({ success: true }, { status: 200 });
      }

      const email = normalizeEmail(parsed.data.email);

      // Dedup: if this lead has no email, check if another lead already owns this email
      let effectiveLeadId = lead_id;
      let effectiveLeadData = leadData;

      if (!leadData.email || leadData.email === "") {
        const existing = await findLeadByEmail(email);
        if (existing && existing.id !== lead_id) {
          // Merge plan data from the empty-email lead into the existing one
          const mergeData: Record<string, unknown> = {
            name: parsed.data.name || existing.data.name,
            updated_at: new Date(),
          };
          if (leadData.plan_id) mergeData.plan_id = leadData.plan_id;
          if (leadData.industry && !existing.data.industry) {
            mergeData.industry = leadData.industry;
          }
          if (leadData.bottleneck && !existing.data.bottleneck) {
            mergeData.bottleneck = leadData.bottleneck;
          }
          await db.collection("leads").doc(existing.id).update(mergeData);

          // Mark the empty-email lead as merged
          await db.collection("leads").doc(lead_id).update({
            status: "merged",
            merged_into: existing.id,
            updated_at: new Date(),
          });

          effectiveLeadId = existing.id;
          effectiveLeadData = { ...existing.data, ...mergeData };
        }
      }

      const score = computeLeadScore({
        email,
        company: effectiveLeadData.company,
        bottleneck: effectiveLeadData.bottleneck,
        urgency: effectiveLeadData.urgency,
        completed_agent_demo: true,
        preview_plan_sent: true,
        utm_source: effectiveLeadData.utm_source,
      });

      await db.collection("leads").doc(effectiveLeadId).update({
        name: parsed.data.name,
        email,
        score: Math.max(score, (effectiveLeadData.score as number) || 0),
        preview_plan_sent_at: new Date(),
        updated_at: new Date(),
      });

      // Log email activity on the lead
      db.collection("leads").doc(effectiveLeadId).collection("activity").add({
        type: "email_sent",
        content: "Preview Plan sent",
        created_at: new Date(),
      }).catch(() => {});

      // Fire-and-forget: admin notification + nurture enrollment
      sendAdminNotification({
        name: parsed.data.name,
        email,
        company: effectiveLeadData.company as string | undefined,
        industry: effectiveLeadData.industry as string | undefined,
        bottleneck: effectiveLeadData.bottleneck as string | undefined,
        score,
        source: effectiveLeadData.source as "contact" | "agent_demo" | "agent_chat",
      }).catch(() => {});

      enrollInNurture({
        lead_id: effectiveLeadId,
        name: parsed.data.name,
        email,
        industry: effectiveLeadData.industry as string | undefined,
        bottleneck: effectiveLeadData.bottleneck as string | undefined,
      }).catch(() => {});
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("Send email request failed", err);
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    );
  }
}
