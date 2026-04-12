import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/firebase/auth";
import { getAggregatedMetrics } from "@/lib/firestore/traces";
import type { PipelineMetrics } from "@/lib/firestore/traces";

// ---------------------------------------------------------------------------
// In-memory TTL cache (5 minutes)
// ---------------------------------------------------------------------------

let _cache: { data: PipelineMetrics; expires: number } | null = null;
const CACHE_TTL_MS = 5 * 60_000;

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    if (_cache && Date.now() < _cache.expires) {
      return NextResponse.json(_cache.data);
    }

    const metrics = await getAggregatedMetrics(7);
    _cache = { data: metrics, expires: Date.now() + CACHE_TTL_MS };
    return NextResponse.json(metrics);
  } catch {
    return NextResponse.json(
      { error: "Failed to load pipeline metrics" },
      { status: 500 }
    );
  }
}
