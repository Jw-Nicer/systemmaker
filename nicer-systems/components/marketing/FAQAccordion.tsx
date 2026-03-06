"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { FAQ } from "@/types/faq";

interface FAQAccordionProps {
  faqs: FAQ[];
}

export function FAQAccordion({ faqs }: FAQAccordionProps) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {faqs.map((faq) => {
        const isOpen = openId === faq.id;
        return (
          <div
            key={faq.id}
            className={`rounded-xl border bg-glass-bg backdrop-blur-[var(--glass-blur)] overflow-hidden transition-all ${
              isOpen
                ? "border-glass-border border-l-2 border-l-primary shadow-[var(--glow-sm)]"
                : "border-glass-border hover:border-primary/20 hover:shadow-[var(--glow-sm)]"
            }`}
          >
            <button
              onClick={() => setOpenId(isOpen ? null : faq.id)}
              className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-surface-light/30 transition-colors"
            >
              <span className="font-medium pr-4">{faq.question}</span>
              <motion.svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={`shrink-0 transition-colors ${isOpen ? "text-primary [filter:drop-shadow(0_0_6px_rgba(0,212,255,0.5))]" : "text-muted"}`}
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <polyline points="6 9 12 15 18 9" />
              </motion.svg>
            </button>
            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                >
                  <div className="px-6 pb-4 text-sm text-muted leading-relaxed bg-primary/[0.02]">
                    {faq.answer}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
