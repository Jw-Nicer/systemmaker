"use client";

import { useState } from "react";
import { BookingModal } from "./BookingModal";
import { EVENTS, track } from "@/lib/analytics";

interface BookingCTAButtonProps {
  className?: string;
  ctaText?: string;
  source?: string;
  onOpen?: () => void;
}

export function BookingCTAButton({
  className = "",
  ctaText = "Book a Scoping Call",
  source = "final_cta",
  onOpen,
}: BookingCTAButtonProps) {
  const [showBooking, setShowBooking] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          track(EVENTS.BOOKING_CLICK, { source });
          onOpen?.();
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
