import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { leadSchema } from "@/lib/validation";
import { computeLeadScore, scoreLabel } from "@/lib/lead-scoring";
import { syncLeadToCRM } from "@/lib/crm-sync";
import { getActiveSequenceByTrigger, enrollLead } from "@/lib/firestore/email-sequences";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = leadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Compute lead score
    const score = computeLeadScore({
      urgency: parsed.data.urgency,
      has_bottleneck: !!parsed.data.bottleneck,
      has_tools: !!parsed.data.tools,
      source: "contact",
      has_preview_plan: false,
    });

    const now = new Date();
    const docRef = await getAdminDb().collection("leads").add({
      ...parsed.data,
      status: "new",
      source: "contact",
      score,
      score_label: scoreLabel(score),
      created_at: now,
    });

    // Fire-and-forget: CRM sync
    syncLeadToCRM({
      id: docRef.id,
      name: parsed.data.name,
      email: parsed.data.email,
      company: parsed.data.company,
      bottleneck: parsed.data.bottleneck ?? "",
      tools: parsed.data.tools ?? "",
      urgency: parsed.data.urgency ?? "",
      score,
      score_label: scoreLabel(score),
      source: "contact",
      utm_source: parsed.data.utm_source,
      utm_medium: parsed.data.utm_medium,
      utm_campaign: parsed.data.utm_campaign,
      created_at: now.toISOString(),
    }).catch((err) => console.error("CRM sync failed:", err));

    // Fire-and-forget: enroll in nurture sequence
    getActiveSequenceByTrigger("lead_submit")
      .then((seq) => {
        if (seq && seq.steps.length > 0) {
          return enrollLead(docRef.id, seq.id, seq.steps[0].delay_days);
        }
      })
      .catch((err) => console.error("Sequence enrollment failed:", err));

    return NextResponse.json({ lead_id: docRef.id }, { status: 201 });
  } catch (err) {
    console.error("Lead insert error:", err);
    return NextResponse.json(
      { error: "Failed to save lead" },
      { status: 500 }
    );
  }
}
