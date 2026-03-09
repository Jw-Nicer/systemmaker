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
            className={`relative rounded-[var(--radius-card)] border overflow-hidden transition-all duration-300 ${
              isOpen
                ? "bg-[var(--cream-card)] border-[var(--border-light)] shadow-[var(--shadow-card)]"
                : "bg-[var(--cream-card)]/70 border-[var(--border-subtle)] hover:border-[var(--border-light)] hover:shadow-[var(--shadow-card)]"
            }`}
          >
            {/* Accent bar */}
            <div
              className={`absolute left-0 top-0 bottom-0 w-0.5 rounded-full transition-opacity duration-300 bg-[var(--green-accent)] ${
                isOpen ? "opacity-100" : "opacity-20"
              }`}
            />

            <button
              onClick={() => setOpenId(isOpen ? null : faq.id)}
              className="relative flex w-full items-start justify-between gap-3 px-4 py-4 text-left transition-colors sm:px-6"
            >
              <span className="pr-2 font-medium text-[var(--text-heading)] sm:pr-4">
                {faq.question}
              </span>
              <motion.svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={`shrink-0 transition-colors duration-300 ${
                  isOpen ? "text-[var(--text-heading)]" : "text-[var(--text-muted)]"
                }`}
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
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
                  transition={{ type: "spring", stiffness: 200, damping: 25 }}
                >
                  <div className="rounded-b-[20px] bg-[var(--cream-muted)] px-4 pb-4 text-sm leading-relaxed text-[var(--text-body)] sm:px-6">
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
