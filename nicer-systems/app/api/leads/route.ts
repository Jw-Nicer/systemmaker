import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { leadSchema } from "@/lib/validation";
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

    const score = computeLeadScore({
      email: parsed.data.email,
      company: parsed.data.company,
      bottleneck: parsed.data.bottleneck,
      urgency: parsed.data.urgency,
      utm_source: parsed.data.utm_source,
    });

    const docRef = await getAdminDb().collection("leads").add({
      ...parsed.data,
      score,
      status: "new",
      source: "contact",
      created_at: new Date(),
    });

    // Fire-and-forget admin notification
    sendAdminNotification({
      name: parsed.data.name,
      email: parsed.data.email,
      company: parsed.data.company,
      industry: undefined,
      bottleneck: parsed.data.bottleneck,
      score,
      source: "contact",
    }).catch(() => {});

    // Fire-and-forget nurture sequence enrollment
    enrollInNurture({
      lead_id: docRef.id,
      name: parsed.data.name,
      email: parsed.data.email,
      bottleneck: parsed.data.bottleneck,
    }).catch(() => {});

    return NextResponse.json({ lead_id: docRef.id }, { status: 201 });
  } catch (err) {
    console.error("Lead insert error:", err);
    return NextResponse.json(
      { error: "Failed to save lead" },
      { status: 500 }
    );
  }
}
