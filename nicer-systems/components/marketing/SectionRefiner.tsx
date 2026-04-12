"use client";

import { useState, useMemo } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { motion, AnimatePresence } from "framer-motion";
import { useRefineSection } from "@/hooks/useRefineSection";
import type { RefineSectionKey } from "@/lib/plans/refinement";
import { mapRefineSectionKeyToPlanSection } from "@/lib/plans/refinement";
import { getSectionSuggestions } from "@/lib/agents/refinement-suggestions";
import type { PreviewPlan } from "@/types/preview-plan";

interface SectionRefinerProps {
  sectionKey: RefineSectionKey;
  planId: string;
  /** The current content of the section being refined */
  originalContent: string;
  /** The full plan — used to generate contextual suggestions */
  plan?: PreviewPlan;
  /** Called when refinement produces new content */
  onRefined: (sectionKey: RefineSectionKey, newContent: string) => void;
  /** Called to close the refiner */
  onClose: () => void;
}

const FALLBACK_CHIPS = [
  { label: "Add more detail", feedback: "Add more detail" },
  { label: "What about edge cases?", feedback: "What about edge cases?" },
  { label: "Focus on cost savings", feedback: "Focus on cost savings" },
  { label: "Make it simpler", feedback: "Make it simpler" },
];

export function SectionRefiner({
  sectionKey,
  planId,
  originalContent,
  plan,
  onRefined,
  onClose,
}: SectionRefinerProps) {
  const reduced = useReducedMotion();

  const suggestions = useMemo(() => {
    if (!plan) return FALLBACK_CHIPS;
    const planSection = mapRefineSectionKeyToPlanSection(sectionKey);
    const contextual = getSectionSuggestions(plan, planSection);
    return contextual.length > 0 ? contextual : FALLBACK_CHIPS;
  }, [plan, sectionKey]);

  const [messages, setMessages] = useState<
    { role: "user" | "agent"; content: string }[]
  >([]);
  const [input, setInput] = useState("");

  const {
    isRefining,
    isApplying,
    streamingContent,
    refinedContent,
    error,
    showDiff,
    refine,
    applyRefinement,
    toggleDiff,
    clearRefinement,
  } = useRefineSection(planId, sectionKey);

  async function sendRefinement(feedback: string) {
    setMessages((prev) => [...prev, { role: "user", content: feedback }]);
    setInput("");

    const succeeded = await refine(feedback, originalContent);
    if (succeeded) {
      setMessages((prev) => [
        ...prev,
        {
          role: "agent",
          content: "I've updated this section. You can view the changes or apply them.",
        },
      ]);
    }
  }

  async function handleApply() {
    if (!refinedContent) return;

    const savedContent = await applyRefinement();
    if (savedContent) {
      onRefined(sectionKey, savedContent);
      onClose();
    }
  }

  function handleClose() {
    clearRefinement();
    onClose();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && !isRefining) {
        sendRefinement(input.trim());
      }
    }
  }

  const wrapper = (children: React.ReactNode) =>
    reduced ? (
      <div>{children}</div>
    ) : (
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.2 }}
      >
        {children}
      </motion.div>
    );

  return (
    <AnimatePresence>
      {wrapper(
        <div className="mt-3 rounded-lg border border-primary/20 bg-background p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-primary font-medium uppercase tracking-wide">
              Refine Section
            </p>
            <button
              onClick={handleClose}
              className="text-xs text-muted hover:text-foreground transition-colors"
            >
              Close
            </button>
          </div>

          {/* Suggestion chips */}
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((chip) => (
              <button
                key={chip.label}
                onClick={() => sendRefinement(chip.feedback)}
                disabled={isRefining}
                title={chip.feedback}
                className="text-xs px-2.5 py-1 rounded-full border border-border bg-surface hover:bg-surface-light transition-colors disabled:opacity-50"
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Mini chat messages */}
          {messages.length > 0 && (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`text-xs px-3 py-1.5 rounded-lg ${
                    msg.role === "user"
                      ? "bg-primary/10 text-foreground ml-8"
                      : "bg-surface-light text-muted mr-8"
                  }`}
                >
                  {msg.content}
                </div>
              ))}
              {isRefining && (
                <div className="text-xs text-muted px-3">
                  {streamingContent ? (
                    <p className="whitespace-pre-wrap">{streamingContent}</p>
                  ) : (
                    <span className="animate-pulse">Refining...</span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="text-xs text-red-400 px-3">{error}</p>
          )}

          {/* Input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tell the agent how to improve this section..."
              disabled={isRefining}
              className="flex-1 px-3 py-1.5 rounded-lg bg-surface border border-border text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none disabled:opacity-50"
            />
            <button
              onClick={() => input.trim() && sendRefinement(input.trim())}
              disabled={isRefining || !input.trim()}
              className="px-3 py-1.5 rounded-lg bg-primary text-background text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-30"
            >
              Send
            </button>
          </div>

          {/* Diff / Apply controls */}
          {refinedContent && (
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={toggleDiff}
                className="text-xs text-muted hover:text-foreground transition-colors"
              >
                {showDiff ? "Hide changes" : "View changes"}
              </button>
              <button
                onClick={handleApply}
                 disabled={!!error || isRefining || isApplying}
                  className="text-xs px-3 py-1 rounded-md bg-primary text-background font-medium hover:opacity-90 transition-opacity disabled:opacity-30"
                >
                 {isApplying ? "Saving..." : "Apply changes"}
               </button>
            </div>
          )}

          {/* Inline diff */}
          {showDiff && refinedContent && (
            <div className="mt-2">
              <PlanVersionDiffInline
                original={originalContent}
                refined={refinedContent}
              />
            </div>
          )}
        </div>
      )}
    </AnimatePresence>
  );
}

/** Inline diff component — lightweight version used inside SectionRefiner */
function PlanVersionDiffInline({
  original,
  refined,
}: {
  original: string;
  refined: string;
}) {
  const [view, setView] = useState<"split" | "refined">("split");

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="flex border-b border-border bg-surface-light/50">
        <button
          onClick={() => setView("split")}
          className={`flex-1 text-xs py-1.5 transition-colors ${
            view === "split"
              ? "text-foreground bg-surface"
              : "text-muted hover:text-foreground"
          }`}
        >
          Side by side
        </button>
        <button
          onClick={() => setView("refined")}
          className={`flex-1 text-xs py-1.5 transition-colors ${
            view === "refined"
              ? "text-foreground bg-surface"
              : "text-muted hover:text-foreground"
          }`}
        >
          Refined only
        </button>
      </div>

      {view === "split" ? (
        <div className="grid grid-cols-2 divide-x divide-border">
          <div className="p-3">
            <p className="text-[10px] text-muted uppercase tracking-wide mb-1.5">
              Original
            </p>
            <p className="text-xs text-muted/80 leading-relaxed whitespace-pre-wrap">
              {original}
            </p>
          </div>
          <div className="p-3">
            <p className="text-[10px] text-primary uppercase tracking-wide mb-1.5">
              Refined
            </p>
            <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">
              {refined}
            </p>
          </div>
        </div>
      ) : (
        <div className="p-3">
          <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">
            {refined}
          </p>
        </div>
      )}
    </div>
  );
}
