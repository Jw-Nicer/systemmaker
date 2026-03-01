import { NextResponse } from "next/server";
import { recordImpression } from "@/lib/actions/ab-tests";

export async function POST(request: Request) {
  try {
    const { test_id, variant_id } = await request.json();
    if (!test_id || !variant_id) {
      return NextResponse.json({ error: "Missing test_id or variant_id" }, { status: 400 });
    }
    await recordImpression(test_id, variant_id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("AB impression error:", err);
    return NextResponse.json({ error: "Failed to record impression" }, { status: 500 });
  }
}
