import { NextResponse } from "next/server";
import { getPlanById } from "@/lib/firestore/plans";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Missing plan id parameter" },
        { status: 400 }
      );
    }

    const plan = await getPlanById(id);

    if (!plan || !plan.is_public) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    return NextResponse.json({ plan }, { status: 200 });
  } catch (err) {
    console.error("Plans GET error:", err);
    return NextResponse.json(
      { error: "Failed to fetch plan" },
      { status: 500 }
    );
  }
}
