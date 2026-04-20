"use client";

import { useState } from "react";
import { BookingModal } from "./BookingModal";
import { EVENTS, track, type EventName } from "@/lib/analytics";

interface BookingCTAButtonProps {
  className?: string;
  ctaText?: string;
  source?: string;
  onOpen?: () => void;
  extraEventName?: EventName;
  extraEventPayload?: Record<string, unknown>;
}

export function BookingCTAButton({
  className = "",
  ctaText = "Book a Scoping Call",
  source = "final_cta",
  onOpen,
  extraEventName,
  extraEventPayload,
}: BookingCTAButtonProps) {
  const [showBooking, setShowBooking] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          track(EVENTS.BOOKING_CLICK, { source });
          if (extraEventName) {
            track(extraEventName, extraEventPayload);
          }
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
