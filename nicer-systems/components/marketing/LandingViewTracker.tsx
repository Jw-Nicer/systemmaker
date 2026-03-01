"use client";

import { useEffect } from "react";
import { track, EVENTS } from "@/lib/analytics";

export function LandingViewTracker() {
  useEffect(() => {
    track(EVENTS.LANDING_VIEW);
  }, []);

  return null;
}
