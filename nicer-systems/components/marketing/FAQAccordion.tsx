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
            className={`relative rounded-[20px] border overflow-hidden transition-all duration-300 ${
              isOpen
                ? "bg-[#f8f4ea] border-[#b5ad9e] shadow-[0_8px_30px_rgba(77,63,43,0.06)]"
                : "bg-[#f8f4ea]/70 border-[#d7d0c0] hover:border-[#b5ad9e] hover:shadow-[0_8px_30px_rgba(77,63,43,0.06)]"
            }`}
          >
            {/* Accent bar */}
            <div
              className={`absolute left-0 top-0 bottom-0 w-0.5 rounded-full transition-opacity duration-300 bg-[#3f5a37] ${
                isOpen ? "opacity-100" : "opacity-0"
              }`}
            />

            <button
              onClick={() => setOpenId(isOpen ? null : faq.id)}
              className="relative flex w-full items-start justify-between gap-3 px-4 py-4 text-left transition-colors sm:px-6"
            >
              <span className="pr-2 font-medium text-[#1d2318] sm:pr-4">
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
                  isOpen ? "text-[#1d2318]" : "text-[#7e7b70]"
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
                  <div className="rounded-b-[20px] bg-[#f2ede2] px-4 pb-4 text-sm leading-relaxed text-[#50584b] sm:px-6">
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
