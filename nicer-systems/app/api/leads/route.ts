import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { leadSchema } from "@/lib/validation";
import { computeLeadScore } from "@/lib/leads/scoring";
import { findLeadByEmail, normalizeEmail } from "@/lib/leads/dedup";
import { sendAdminNotification } from "@/lib/email/admin-notification";
import { enrollInNurture } from "@/lib/email/nurture-sequence";
import { sendConfirmationEmail } from "@/lib/email/confirmation-email";
import { dispatchCRMWebhook } from "@/lib/crm/sync";
import {
  enforceRateLimit,
  hasFilledHoneypot,
} from "@/lib/security/request-guards";

export async function POST(request: Request) {
  try {
    const limited = await enforceRateLimit(request, {
      keyPrefix: "leads",
      windowMs: 60_000,
      maxRequests: 6,
    });
    if (limited) return limited;

    const body = await request.json();
    if (hasFilledHoneypot(body)) {
      return NextResponse.json({ error: "Validation failed" }, { status: 400 });
    }

    const parsed = leadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const email = normalizeEmail(parsed.data.email);

    const score = computeLeadScore({
      email,
      company: parsed.data.company,
      bottleneck: parsed.data.bottleneck,
      urgency: parsed.data.urgency,
      utm_source: parsed.data.utm_source,
    });

    // Dedup: check for existing lead with same email
    const existing = await findLeadByEmail(email);
    let leadId: string;

    if (existing) {
      const db = getAdminDb();
      await db.collection("leads").doc(existing.id).update({
        name: parsed.data.name,
        email,
        company: parsed.data.company,
        bottleneck: parsed.data.bottleneck || existing.data.bottleneck,
        tools: parsed.data.tools || existing.data.tools,
        urgency: parsed.data.urgency || existing.data.urgency,
        score: Math.max(score, (existing.data.score as number) || 0),
        updated_at: new Date(),
      });
      db.collection("leads").doc(existing.id).collection("activity").add({
        type: "lead_merged",
        content: "Duplicate contact form submission merged",
        created_at: new Date(),
      }).catch(() => {});
      leadId = existing.id;
    } else {
      const docRef = await getAdminDb().collection("leads").add({
        ...parsed.data,
        email,
        score,
        status: "new",
        source: "contact",
        created_at: new Date(),
      });
      leadId = docRef.id;
    }

    // Fire-and-forget confirmation email to lead
    sendConfirmationEmail({
      name: parsed.data.name,
      email,
      bottleneck: parsed.data.bottleneck,
    }).catch(() => {});

    // Fire-and-forget admin notification
    sendAdminNotification({
      name: parsed.data.name,
      email,
      company: parsed.data.company,
      industry: undefined,
      bottleneck: parsed.data.bottleneck,
      score,
      source: "contact",
    }).catch(() => {});

    // Fire-and-forget nurture sequence enrollment
    enrollInNurture({
      lead_id: leadId,
      name: parsed.data.name,
      email,
      bottleneck: parsed.data.bottleneck,
    }).catch(() => {});

    // Fire-and-forget CRM webhook (5D)
    dispatchCRMWebhook("lead_created", {
      lead_id: leadId,
      name: parsed.data.name,
      email,
      company: parsed.data.company,
      bottleneck: parsed.data.bottleneck,
      score,
      source: "contact",
    }).catch(() => {});

    return NextResponse.json(
      { lead_id: leadId },
      { status: existing ? 200 : 201 }
    );
  } catch (err) {
    console.error("Lead insert error:", err);
    return NextResponse.json(
      { error: "Failed to save lead" },
      { status: 500 }
    );
  }
}
