"use client";

import Link from "next/link";

interface PreviewBannerProps {
  draftCounts: {
    caseStudies: number;
    testimonials: number;
    faqs: number;
    offers: number;
  };
}

export function PreviewBanner({ draftCounts }: PreviewBannerProps) {
  const totalDrafts = Object.values(draftCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="sticky top-0 z-[60] border-b border-amber-300 bg-amber-50 px-4 py-3 text-center text-sm text-amber-900">
      <strong>Preview Mode</strong> — Showing all content including{" "}
      <strong>{totalDrafts} unpublished</strong>{" "}
      {totalDrafts === 1 ? "item" : "items"}.{" "}
      <Link
        href="/admin"
        className="font-medium underline underline-offset-2 transition-colors hover:text-amber-700"
      >
        Back to Admin
      </Link>
    </div>
  );
}
