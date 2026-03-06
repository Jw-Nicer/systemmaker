import { NextResponse } from "next/server";
import { getPlanById } from "@/lib/firestore/plans";
import { enforceRateLimit } from "@/lib/security/request-guards";

export async function GET(request: Request) {
  try {
    const limited = await enforceRateLimit(request, {
      keyPrefix: "plans_get",
      windowMs: 60_000,
      maxRequests: 30,
    });
    if (limited) return limited;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id || id.length > 128 || !/^[a-zA-Z0-9_-]+$/.test(id)) {
      return NextResponse.json(
        { error: "Invalid plan id" },
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
