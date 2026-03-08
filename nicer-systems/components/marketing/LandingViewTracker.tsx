"use client";

import { useEffect } from "react";
import { track, EVENTS } from "@/lib/analytics";

export function LandingViewTracker({
  landingPath,
  industrySlug,
  industryName,
}: {
  landingPath?: string;
  industrySlug?: string;
  industryName?: string;
} = {}) {
  useEffect(() => {
    track(EVENTS.LANDING_VIEW, {
      landing_path: landingPath ?? window.location.pathname,
      industry_slug: industrySlug,
      industry_name: industryName,
    });
  }, [industryName, industrySlug, landingPath]);

  return null;
}
