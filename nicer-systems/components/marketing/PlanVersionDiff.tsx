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
  /**
   * Compact rendering for use inside small panels (e.g. SectionRefiner).
   * Drops the "original only" tab and shrinks padding/typography.
   */
  compact?: boolean;
}

type View = "split" | "original" | "refined";

export function PlanVersionDiff({
  original,
  refined,
  sectionTitle,
  compact = false,
}: PlanVersionDiffProps) {
  const reduced = useReducedMotion();
  const [view, setView] = useState<View>("split");

  const tabs: View[] = compact ? ["split", "refined"] : ["split", "original", "refined"];
  const tabLabel: Record<View, string> = compact
    ? { split: "Side by side", original: "Original", refined: "Refined only" }
    : { split: "split", original: "original", refined: "refined" };

  const textSize = compact ? "text-xs" : "text-sm";
  const padding = compact ? "p-3" : "p-4";

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      {/* Header */}
      <div
        className={`flex items-center ${
          compact ? "" : "justify-between px-4 py-2.5"
        } border-b border-border bg-surface-light/50`}
      >
        {sectionTitle && !compact && (
          <span className="text-xs font-medium text-foreground">{sectionTitle}</span>
        )}
        <div
          className={
            compact
              ? "flex w-full"
              : "flex gap-0.5 rounded-md border border-border bg-surface overflow-hidden ml-auto"
          }
        >
          {tabs.map((v) => {
            const isActive = view === v;
            const baseClass = compact
              ? `flex-1 text-xs py-1.5 transition-colors ${
                  isActive
                    ? "text-foreground bg-surface"
                    : "text-muted hover:text-foreground"
                }`
              : `text-[11px] px-2.5 py-1 capitalize transition-colors ${
                  isActive
                    ? "bg-primary text-background"
                    : "text-muted hover:text-foreground"
                }`;
            return (
              <button key={v} onClick={() => setView(v)} className={baseClass}>
                {tabLabel[v]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {view === "split" ? (
          <DiffPanel key="split" reduced={reduced}>
            <div className="grid grid-cols-2 divide-x divide-border min-h-[100px]">
              <div className={padding}>
                <p
                  className={`${
                    compact ? "text-[10px] text-muted" : "text-[10px] text-red-400"
                  } uppercase tracking-wide mb-2 font-medium`}
                >
                  Original
                </p>
                <div
                  className={`${textSize} text-muted/80 leading-relaxed whitespace-pre-wrap`}
                >
                  {original}
                </div>
              </div>
              <div className={padding}>
                <p
                  className={`${
                    compact ? "text-[10px] text-primary" : "text-[10px] text-green-400"
                  } uppercase tracking-wide mb-2 font-medium`}
                >
                  Refined
                </p>
                <div
                  className={`${textSize} text-foreground leading-relaxed whitespace-pre-wrap`}
                >
                  {refined}
                </div>
              </div>
            </div>
          </DiffPanel>
        ) : view === "original" ? (
          <DiffPanel key="original" reduced={reduced}>
            <div className={padding}>
              <div
                className={`${textSize} text-muted/80 leading-relaxed whitespace-pre-wrap`}
              >
                {original}
              </div>
            </div>
          </DiffPanel>
        ) : (
          <DiffPanel key="refined" reduced={reduced}>
            <div className={padding}>
              <div
                className={`${textSize} text-foreground leading-relaxed whitespace-pre-wrap`}
              >
                {refined}
              </div>
            </div>
          </DiffPanel>
        )}
      </AnimatePresence>
    </div>
  );
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
