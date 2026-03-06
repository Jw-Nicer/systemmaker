"use client";

import { useEffect, useState, useRef } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface GlitchTextProps {
  text: string;
  className?: string;
  duration?: number;
}

const glitchChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&*";

export function GlitchText({ text, className = "", duration = 600 }: GlitchTextProps) {
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(text);
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (reduced || hasAnimated) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();

        const chars = text.split("");
        const totalSteps = 20;
        const stepDuration = duration / totalSteps;
        let step = 0;

        const interval = setInterval(() => {
          step++;
          const revealedCount = Math.floor((step / totalSteps) * chars.length);

          const result = chars.map((char, i) => {
            if (char === " " || char === "\n") return char;
            if (i < revealedCount) return char;
            return glitchChars[Math.floor(Math.random() * glitchChars.length)];
          });

          setDisplay(result.join(""));

          if (step >= totalSteps) {
            clearInterval(interval);
            setDisplay(text);
            setHasAnimated(true);
          }
        }, stepDuration);

        return () => clearInterval(interval);
      },
      { threshold: 0.5 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [text, duration, reduced, hasAnimated]);

  return (
    <span ref={ref} className={className}>
      {display}
    </span>
  );
}
