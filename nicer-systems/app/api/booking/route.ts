import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { bookingSchema } from "@/lib/validation";
import { computeLeadScore } from "@/lib/leads/scoring";
import { findLeadByEmail, normalizeEmail } from "@/lib/leads/dedup";
import { sendBookingNotification } from "@/lib/email/booking-notification";
import {
  enforceRateLimit,
  hasFilledHoneypot,
} from "@/lib/security/request-guards";

export async function POST(request: Request) {
  try {
    const limited = await enforceRateLimit(request, {
      keyPrefix: "booking",
      windowMs: 60_000,
      maxRequests: 3,
    });
    if (limited) return limited;

    const body = await request.json();
    if (hasFilledHoneypot(body)) {
      return NextResponse.json({ error: "Validation failed" }, { status: 400 });
    }

    const parsed = bookingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Business rule: date must be in the future
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(parsed.data.preferred_date + "T00:00:00");
    if (selectedDate <= today) {
      return NextResponse.json(
        { error: "Date must be in the future" },
        { status: 400 }
      );
    }

    const email = normalizeEmail(parsed.data.email);
    const db = getAdminDb();

    // Find or create lead
    const existing = await findLeadByEmail(email);
    let leadId: string;

    if (existing) {
      // Update existing lead to "booked" status
      await db.collection("leads").doc(existing.id).update({
        status: "booked",
        booked_date: parsed.data.preferred_date,
        booked_time: parsed.data.preferred_time,
        score: Math.max(
          computeLeadScore({
            email,
            company: existing.data.company as string | undefined,
            bottleneck: existing.data.bottleneck as string | undefined,
            urgency: existing.data.urgency as string | undefined,
            completed_agent_demo: !!existing.data.completed_agent_demo,
            preview_plan_sent: !!existing.data.preview_plan_sent,
            booked_call: true,
            utm_source: existing.data.utm_source as string | undefined,
          }),
          (existing.data.score as number) || 0
        ),
        updated_at: new Date(),
      });

      // Log activity
      db.collection("leads").doc(existing.id).collection("activity").add({
        type: "status_change",
        content: `Scoping call booked: ${parsed.data.preferred_date} at ${parsed.data.preferred_time}`,
        created_at: new Date(),
      }).catch(() => {});

      leadId = existing.id;
    } else {
      // Create minimal lead from booking
      const score = computeLeadScore({ email, booked_call: true });
      const docRef = await db.collection("leads").add({
        name: parsed.data.name,
        email,
        score,
        status: "booked",
        source: "booking",
        booked_date: parsed.data.preferred_date,
        booked_time: parsed.data.preferred_time,
        created_at: new Date(),
      });
      leadId = docRef.id;
    }

    // Send admin notification (blocking — booking IS the core action)
    await sendBookingNotification({
      name: parsed.data.name,
      email,
      preferred_date: parsed.data.preferred_date,
      preferred_time: parsed.data.preferred_time,
      message: parsed.data.message,
    });

    return NextResponse.json(
      { success: true, lead_id: leadId },
      { status: existing ? 200 : 201 }
    );
  } catch (err) {
    console.error("[booking] Request failed:", err);
    return NextResponse.json(
      { error: "Failed to process booking" },
      { status: 500 }
    );
  }
}
