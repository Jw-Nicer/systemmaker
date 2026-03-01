import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { eventSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = eventSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    await getAdminDb().collection("events").add({
      event_name: parsed.data.event_name,
      payload: parsed.data.payload ?? {},
      lead_id: parsed.data.lead_id ?? null,
      created_at: new Date(),
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    console.error("Event insert error:", err);
    return NextResponse.json(
      { error: "Failed to save event" },
      { status: 500 }
    );
  }
}
