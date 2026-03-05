"use client";

import { useEffect } from "react";
import { track, EVENTS } from "@/lib/analytics";

export function PlanViewTracker({ planId }: { planId: string }) {
  useEffect(() => {
    track(EVENTS.PLAN_VIEW_SHARED, { plan_id: planId });
  }, [planId]);

  return null;
}
