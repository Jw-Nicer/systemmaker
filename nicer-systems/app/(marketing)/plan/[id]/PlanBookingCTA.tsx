"use client";

import { useState } from "react";
import Link from "next/link";
import { BookingModal } from "@/components/marketing/BookingModal";
import { EVENTS, track } from "@/lib/analytics";

export function PlanBookingCTA() {
  const [showBooking, setShowBooking] = useState(false);

  return (
    <div className="mt-12 rounded-xl border border-primary/30 bg-surface p-8 text-center">
      <h2 className="text-xl font-bold mb-2">
        Ready to turn this into a real system?
      </h2>
      <p className="text-muted mb-6">
        Book a 45-minute scoping call and we&apos;ll walk through this plan together,
        clarify assumptions, and map out your implementation.
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          onClick={() => {
            track(EVENTS.BOOKING_CLICK, { source: "plan_page" });
            setShowBooking(true);
          }}
          className="inline-flex items-center gap-2 rounded-full bg-[#171d13] px-6 py-3 text-sm font-semibold text-[#f7f2e8] transition-transform hover:scale-[1.02]"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          Book your scoping call
        </button>
        <Link
          href="/#see-it-work"
          className="inline-block px-6 py-3 rounded-full border border-[#d0c8b8] bg-[#fbf7ef] text-sm font-semibold text-[#27311f] transition-colors hover:bg-white"
        >
          Generate Your Own Preview Plan
        </Link>
      </div>

      <BookingModal
        open={showBooking}
        onClose={() => setShowBooking(false)}
        source="plan_page"
      />
    </div>
  );
}
