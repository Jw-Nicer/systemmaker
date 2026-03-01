import { NextResponse } from "next/server";
import { Resend } from "resend";
import { sendEmailSchema } from "@/lib/validation";
import { getAdminDb } from "@/lib/firebase/admin";
import type { PreviewPlan } from "@/types/preview-plan";
import { renderPreviewPlanHTML } from "@/lib/agents/email-template";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { preview_plan, lead_id } = body as {
      preview_plan: PreviewPlan;
      lead_id?: string;
    };

    const parsed = sendEmailSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    if (!preview_plan) {
      return NextResponse.json(
        { error: "Preview plan is required" },
        { status: 400 }
      );
    }

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

    // Update lead with email if we have a lead_id
    if (lead_id) {
      const db = getAdminDb();
      await db.collection("leads").doc(lead_id).update({
        name: parsed.data.name,
        email: parsed.data.email,
        updated_at: new Date(),
      });
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
