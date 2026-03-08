"use client";

import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";

interface FlowTextProps {
  text: string;
  className?: string;
  staggerDelay?: number;
}

export function FlowText({ text, className = "", staggerDelay = 0.03 }: FlowTextProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const reduced = useReducedMotion();

  if (reduced) {
    return <span className={className}>{text}</span>;
  }

  const words = text.split(" ");

  return (
    <span ref={ref} className={className}>
      {words.map((word, i) => (
        <span key={i} className="inline-block overflow-hidden">
          <motion.span
            className="inline-block"
            initial={{ y: "100%", opacity: 0 }}
            animate={isInView ? { y: 0, opacity: 1 } : { y: "100%", opacity: 0 }}
            transition={{
              type: "spring",
              stiffness: 80,
              damping: 20,
              delay: i * staggerDelay,
            }}
          >
            {word}
          </motion.span>
          {i < words.length - 1 && "\u00A0"}
        </span>
      ))}
    </span>
  );
}

/** @deprecated Use FlowText instead */
export const GlitchText = FlowText;
