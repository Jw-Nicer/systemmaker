import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/firebase/auth";
import { getDashboardAnalytics } from "@/lib/admin/analytics";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const analytics = await getDashboardAnalytics();
    return NextResponse.json(analytics);
  } catch {
    return NextResponse.json(
      { error: "Failed to load analytics" },
      { status: 500 }
    );
  }
}
