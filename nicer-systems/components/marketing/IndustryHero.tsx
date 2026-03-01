"use client";

import { motion } from "framer-motion";
import { TrackedLink } from "./TrackedLink";
import { EVENTS } from "@/lib/analytics";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import type { IndustryPage } from "@/types/industry-page";

export function IndustryHero({ page }: { page: IndustryPage }) {
  const reduced = useReducedMotion();

  return (
    <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--theme-primary)]/10 via-background to-background" />

      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        <motion.div
          className="inline-block mb-4 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium"
          initial={reduced ? undefined : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {page.industry_name}
        </motion.div>

        <motion.h1
          className="text-4xl md:text-6xl font-bold mb-6 leading-tight"
          initial={reduced ? undefined : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
        >
          {page.hero_headline}
        </motion.h1>

        <motion.p
          className="text-xl text-muted max-w-2xl mx-auto mb-10"
          initial={reduced ? undefined : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          {page.hero_subheadline}
        </motion.p>

        <motion.div
          className="flex flex-col sm:flex-row gap-4 justify-center"
          initial={reduced ? undefined : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
        >
          <TrackedLink
            href="/contact"
            eventName={EVENTS.CTA_CLICK_BOOK}
            className="px-8 py-4 rounded-lg bg-primary text-background font-semibold text-lg hover:opacity-90 transition-opacity"
          >
            {page.cta_primary_text}
          </TrackedLink>
          <TrackedLink
            href="/contact"
            eventName={EVENTS.CTA_CLICK_PREVIEW_PLAN}
            className="px-8 py-4 rounded-lg border border-primary text-primary font-semibold text-lg hover:bg-primary/10 transition-colors"
          >
            {page.cta_secondary_text}
          </TrackedLink>
        </motion.div>
      </div>
    </section>
  );
}
