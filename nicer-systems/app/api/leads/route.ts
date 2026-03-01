import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { leadSchema } from "@/lib/validation";

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

    const docRef = await getAdminDb().collection("leads").add({
      ...parsed.data,
      status: "new",
      created_at: new Date(),
    });

    return NextResponse.json({ lead_id: docRef.id }, { status: 201 });
  } catch (err) {
    console.error("Lead insert error:", err);
    return NextResponse.json(
      { error: "Failed to save lead" },
      { status: 500 }
    );
  }
}
