"use client";

import { useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { BookingForm } from "./BookingForm";

interface BookingModalProps {
  open: boolean;
  onClose: () => void;
  prefillName?: string;
  prefillEmail?: string;
  source?: string;
}

export function BookingModal({
  open,
  onClose,
  prefillName,
  prefillEmail,
  source,
}: BookingModalProps) {
  const reduced = useReducedMotion();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, handleKeyDown]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={reduced ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0 }}
          transition={{ duration: reduced ? 0 : 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={reduced ? undefined : { opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? undefined : { opacity: 0, y: 16, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="relative z-10 w-full max-w-md rounded-2xl border border-[#d0c8b8] bg-[#fbf7ef] p-6 shadow-[0_24px_60px_rgba(30,40,20,0.18)]"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-[#1d2318]">
                  Book your scoping call
                </h3>
                <p className="text-xs text-[#65705d] mt-0.5">
                  45 minutes — we&apos;ll walk through your plan together
                </p>
              </div>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full text-[#65705d] transition-colors hover:bg-[#e8e2d4] hover:text-[#1d2318]"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <BookingForm
              onClose={onClose}
              prefillName={prefillName}
              prefillEmail={prefillEmail}
              source={source}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
