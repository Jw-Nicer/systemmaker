"use client";

import { useState } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { motion, AnimatePresence } from "framer-motion";

interface PlanVersionDiffProps {
  /** Original section content */
  original: string;
  /** Refined section content */
  refined: string;
  /** Section title for display */
  sectionTitle?: string;
}

export function PlanVersionDiff({
  original,
  refined,
  sectionTitle,
}: PlanVersionDiffProps) {
  const reduced = useReducedMotion();
  const [view, setView] = useState<"split" | "original" | "refined">("split");

  const content = (
    <div className="rounded-lg border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-surface-light/50">
        {sectionTitle && (
          <span className="text-xs font-medium text-foreground">
            {sectionTitle}
          </span>
        )}
        <div className="flex gap-0.5 rounded-md border border-border bg-surface overflow-hidden">
          {(["split", "original", "refined"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`text-[11px] px-2.5 py-1 capitalize transition-colors ${
                view === v
                  ? "bg-primary text-background"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {view === "split" ? (
          <DiffPanel key="split" reduced={reduced}>
            <div className="grid grid-cols-2 divide-x divide-border min-h-[100px]">
              <div className="p-4">
                <p className="text-[10px] text-red-400 uppercase tracking-wide mb-2 font-medium">
                  Original
                </p>
                <div className="text-sm text-muted/80 leading-relaxed whitespace-pre-wrap">
                  {original}
                </div>
              </div>
              <div className="p-4">
                <p className="text-[10px] text-green-400 uppercase tracking-wide mb-2 font-medium">
                  Refined
                </p>
                <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                  {refined}
                </div>
              </div>
            </div>
          </DiffPanel>
        ) : view === "original" ? (
          <DiffPanel key="original" reduced={reduced}>
            <div className="p-4">
              <div className="text-sm text-muted/80 leading-relaxed whitespace-pre-wrap">
                {original}
              </div>
            </div>
          </DiffPanel>
        ) : (
          <DiffPanel key="refined" reduced={reduced}>
            <div className="p-4">
              <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                {refined}
              </div>
            </div>
          </DiffPanel>
        )}
      </AnimatePresence>
    </div>
  );

  return content;
}

function DiffPanel({
  reduced,
  children,
}: {
  reduced: boolean;
  children: React.ReactNode;
}) {
  if (reduced) return <div>{children}</div>;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
    >
      {children}
    </motion.div>
  );
}
