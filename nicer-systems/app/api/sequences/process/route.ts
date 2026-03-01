import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { Resend } from "resend";
import { getDueEnrollments } from "@/lib/firestore/email-sequences";
import type { EmailSequence } from "@/types/email-sequence";

/**
 * POST /api/sequences/process
 * Cron-callable endpoint: finds due enrollments and sends the next email step.
 * Protect with a secret header in production (CRON_SECRET).
 */
export async function POST(request: Request) {
  // Verify cron secret
  const secret = request.headers.get("x-cron-secret");
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Email service not configured" }, { status: 500 });
  }

  try {
    const enrollments = await getDueEnrollments();
    if (enrollments.length === 0) {
      return NextResponse.json({ processed: 0 });
    }

    const resend = new Resend(apiKey);
    const db = getAdminDb();
    let processed = 0;
    let errors = 0;

    for (const enrollment of enrollments) {
      try {
        // Fetch the sequence definition
        const seqDoc = await db
          .collection("email_sequences")
          .doc(enrollment.sequence_id)
          .get();
        if (!seqDoc.exists) continue;
        const sequence = seqDoc.data() as EmailSequence;
        if (!sequence.is_active) continue;

        const step = sequence.steps[enrollment.current_step];
        if (!step) {
          // No more steps — mark completed
          await db
            .collection("sequence_enrollments")
            .doc(enrollment.id)
            .update({ status: "completed", updated_at: new Date().toISOString() });
          continue;
        }

        // Fetch lead email
        const leadDoc = await db.collection("leads").doc(enrollment.lead_id).get();
        if (!leadDoc.exists) continue;
        const lead = leadDoc.data() as { email: string; name: string };

        // Send email
        await resend.emails.send({
          from: "Nicer Systems <onboarding@resend.dev>",
          to: lead.email,
          subject: step.subject,
          html: step.body_html.replace(/\{\{name\}\}/g, lead.name || "there"),
        });

        // Advance enrollment
        const nextStep = enrollment.current_step + 1;
        if (nextStep >= sequence.steps.length) {
          await db
            .collection("sequence_enrollments")
            .doc(enrollment.id)
            .update({
              current_step: nextStep,
              status: "completed",
              updated_at: new Date().toISOString(),
            });
        } else {
          const nextSend = new Date();
          nextSend.setDate(nextSend.getDate() + sequence.steps[nextStep].delay_days);
          await db
            .collection("sequence_enrollments")
            .doc(enrollment.id)
            .update({
              current_step: nextStep,
              next_send_at: nextSend.toISOString(),
              updated_at: new Date().toISOString(),
            });
        }

        processed++;
      } catch (err) {
        console.error(`Failed to process enrollment ${enrollment.id}:`, err);
        errors++;
      }
    }

    return NextResponse.json({ processed, errors });
  } catch (err) {
    console.error("Sequence processing error:", err);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
