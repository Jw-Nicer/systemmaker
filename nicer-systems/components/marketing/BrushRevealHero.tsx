"use client";

import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { TrackedLink } from "./TrackedLink";
import { EVENTS } from "@/lib/analytics";
import { useReducedMotion } from "@/hooks/useReducedMotion";

const BrushRevealCanvas = dynamic(
  () =>
    import("./BrushRevealCanvas").then((mod) => ({
      default: mod.BrushRevealCanvas,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 bg-gradient-to-b from-surface via-background to-background" />
    ),
  }
);

export function BrushRevealHero() {
  const reduced = useReducedMotion();

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
      {/* Background layers */}
      {reduced ? (
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--theme-primary)]/10 via-background to-background" />
      ) : (
        <BrushRevealCanvas />
      )}

      {/* Content overlay */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        <motion.h1
          className="text-5xl md:text-7xl font-bold mb-6 leading-tight"
          initial={reduced ? undefined : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          Tell us the problem.
          <br />
          <span className="text-primary">We&apos;ll build the system.</span>
        </motion.h1>

        <motion.p
          className="text-xl text-muted max-w-2xl mx-auto mb-10"
          initial={reduced ? undefined : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          Ops visibility systems for admin-heavy businesses. Dashboards, alerts,
          and weekly Ops Pulse — installed in 30 days.
        </motion.p>

        <motion.div
          className="flex flex-col sm:flex-row gap-4 justify-center"
          initial={reduced ? undefined : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          <TrackedLink
            href="/contact"
            eventName={EVENTS.CTA_CLICK_BOOK}
            className="px-8 py-4 rounded-lg bg-primary text-background font-semibold text-lg hover:opacity-90 transition-opacity"
          >
            Book a Scoping Call
          </TrackedLink>
          <TrackedLink
            href="/contact"
            eventName={EVENTS.CTA_CLICK_PREVIEW_PLAN}
            className="px-8 py-4 rounded-lg border border-primary text-primary font-semibold text-lg hover:bg-primary/10 transition-colors"
          >
            Get a Preview Plan
          </TrackedLink>
        </motion.div>

        {/* Scroll indicator */}
        {!reduced && (
          <motion.div
            className="absolute bottom-8 left-1/2 -translate-x-1/2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2, duration: 1 }}
          >
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              className="text-muted"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M7 13l5 5 5-5M7 6l5 5 5-5" />
              </svg>
            </motion.div>
          </motion.div>
        )}
      </div>
    </section>
  );
}
