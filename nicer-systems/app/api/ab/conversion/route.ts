import { NextResponse } from "next/server";
import { recordConversion } from "@/lib/actions/ab-tests";

export async function POST(request: Request) {
  try {
    const { test_id, variant_id, event } = await request.json();
    if (!test_id || !variant_id || !event) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    await recordConversion(test_id, variant_id, event);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("AB conversion error:", err);
    return NextResponse.json({ error: "Failed to record conversion" }, { status: 500 });
  }
}
