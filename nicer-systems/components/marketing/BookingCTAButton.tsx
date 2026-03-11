"use client";

import { useState } from "react";
import { BookingModal } from "./BookingModal";
import { EVENTS, track } from "@/lib/analytics";

interface BookingCTAButtonProps {
  className?: string;
  ctaText?: string;
  source?: string;
}

export function BookingCTAButton({
  className = "",
  ctaText = "Book a Scoping Call",
  source = "final_cta",
}: BookingCTAButtonProps) {
  const [showBooking, setShowBooking] = useState(false);

  return (
    <>
      <button
        onClick={() => {
          track(EVENTS.BOOKING_CLICK, { source });
          setShowBooking(true);
        }}
        className={className}
      >
        {ctaText}
      </button>
      <BookingModal
        open={showBooking}
        onClose={() => setShowBooking(false)}
        source={source}
      />
    </>
  );
}
