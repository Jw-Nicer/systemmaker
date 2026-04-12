"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { motion } from "framer-motion";
import { PIPELINE_STAGES } from "@/lib/agents/registry";

interface PlanBuildProgressProps {
  completedStages: Set<string>;
  failedStages?: Set<string>;
}

type StageStatus = "pending" | "running" | "completed" | "failed";

function getStageStatus(
  key: string,
  completedStages: Set<string>,
  failedStages: Set<string>,
  firstPendingIdx: number,
  stageIdx: number
): StageStatus {
  if (completedStages.has(key)) return "completed";
  if (failedStages.has(key)) return "failed";
  if (stageIdx === firstPendingIdx) return "running";
  return "pending";
}

const STATUS_ICON: Record<StageStatus, React.ReactNode> = {
  pending: (
    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#e8eedf] text-[10px] text-[#8b9680]">
      -
    </span>
  ),
  running: (
    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-primary">
      <span className="block h-2.5 w-2.5 animate-pulse rounded-full bg-primary" />
    </span>
  ),
  completed: (
    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500/20 text-green-600 text-xs font-bold">
      ✓
    </span>
  ),
  failed: (
    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500/20 text-red-500 text-xs font-bold">
      ✕
    </span>
  ),
};

/** Smoothly interpolated progress bar that never feels frozen. */
export function PlanBuildProgress({
  completedStages,
  failedStages = new Set(),
}: PlanBuildProgressProps) {
  const reduced = useReducedMotion();
  const total = PIPELINE_STAGES.length;

  // --- elapsed timer ---
  const startRef = useRef(Date.now());
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setElapsed(Date.now() - startRef.current), 1_000);
    return () => clearInterval(id);
  }, []);

  const elapsedSec = Math.floor(elapsed / 1_000);
  const elapsedMin = Math.floor(elapsedSec / 60);
  const elapsedDisplay =
    elapsedMin > 0
      ? `${elapsedMin}m ${String(elapsedSec % 60).padStart(2, "0")}s`
      : `${elapsedSec}s`;

  // --- stage statuses ---
  const firstPendingIdx = PIPELINE_STAGES.findIndex(
    (s) => !completedStages.has(s.key) && !failedStages.has(s.key)
  );

  const items = PIPELINE_STAGES.map((stage, idx) => {
    const status = getStageStatus(
      stage.key,
      completedStages,
      failedStages,
      firstPendingIdx,
      idx
    );
    return { ...stage, status };
  });

  const completedCount = items.filter((i) => i.status === "completed").length;
  const allDone = completedCount === total;
  const runningStage = items.find((i) => i.status === "running");

  // --- smooth interpolated progress ---
  // Base = fraction of completed stages. Creep adds a slow fill within the
  // current stage's slice so the bar always appears to be moving.
  const [displayPercent, setDisplayPercent] = useState(0);
  const targetBaseRef = useRef(0);
  const lastStampRef = useRef(Date.now());

  useEffect(() => {
    targetBaseRef.current = (completedCount / total) * 100;
    lastStampRef.current = Date.now();
  }, [completedCount, total]);

  useEffect(() => {
    if (allDone) {
      setDisplayPercent(100);
      return;
    }
    // Creep rate: fill ~80% of one stage slice over 30 seconds
    const sliceWidth = 100 / total;
    const creepMax = sliceWidth * 0.8;
    const creepDurationMs = 30_000;

    const id = setInterval(() => {
      const base = targetBaseRef.current;
      const dtMs = Date.now() - lastStampRef.current;
      const creep = Math.min((dtMs / creepDurationMs) * creepMax, creepMax);
      setDisplayPercent(Math.min(base + creep, 99));
    }, 200);

    return () => clearInterval(id);
  }, [allDone, total]);

  // --- render ---
  const wrapper = (children: React.ReactNode, key: string) =>
    reduced ? (
      <div key={key}>{children}</div>
    ) : (
      <motion.div
        key={key}
        initial={{ opacity: 0, x: -6 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.15, delay: 0.03 }}
      >
        {children}
      </motion.div>
    );

  return (
    <div className="rounded-[20px] border border-[#d5dccb] bg-[linear-gradient(180deg,rgba(250,247,239,0.95),rgba(241,236,223,0.95))] px-4 py-3 shadow-[0_8px_20px_rgba(56,67,45,0.06)]">
      {/* Header row */}
      <div className="flex items-center justify-between mb-1">
        <p className="text-[11px] uppercase tracking-[0.12em] text-[#72806c] font-medium">
          Building your plan
        </p>
        <span className="text-[11px] text-[#8b9680] tabular-nums">
          {elapsedDisplay}
        </span>
      </div>

      {/* Active stage label */}
      {runningStage && (
        <p className="text-xs text-[#445042] font-medium mb-2 flex items-center gap-1.5">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          {runningStage.label}
        </p>
      )}
      {allDone && (
        <p className="text-xs text-green-700 font-medium mb-2">
          All stages complete
        </p>
      )}

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-[#e2e7d8] mb-1.5 overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
          style={{ width: `${displayPercent}%` }}
        />
      </div>

      {/* Fraction */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] text-[#8b9680] tabular-nums">
          {Math.round(displayPercent)}%
        </span>
        <span className="text-[10px] text-[#8b9680] tabular-nums">
          {completedCount}/{total} stages
        </span>
      </div>

      {/* Stage list */}
      <div className="space-y-1.5">
        {items.map((item) =>
          wrapper(
            <div
              className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors ${
                item.status === "running"
                  ? "bg-primary/5"
                  : item.status === "completed"
                    ? "opacity-70"
                    : ""
              }`}
            >
              {STATUS_ICON[item.status]}
              <span
                className={`text-xs ${
                  item.status === "running"
                    ? "text-[#1d2418] font-medium"
                    : item.status === "completed"
                      ? "text-[#5b6b3a]"
                      : item.status === "failed"
                        ? "text-red-500"
                        : "text-[#8b9680]"
                }`}
              >
                {item.status === "completed" ? item.completeLabel : item.label}
              </span>
            </div>,
            item.key
          )
        )}
      </div>
    </div>
  );
}
