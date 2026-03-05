"use client";

import { useCallback, useRef, useState } from "react";
import { track, EVENTS } from "@/lib/analytics";
import type { PlanSectionType, SSEEvent, SSEMessageData, SSEErrorData } from "@/types/chat";

interface RefinementState {
  isRefining: boolean;
  streamingContent: string;
  refinedContent: string | null;
  originalContent: string | null;
  error: string | null;
  showDiff: boolean;
}

const initialState: RefinementState = {
  isRefining: false,
  streamingContent: "",
  refinedContent: null,
  originalContent: null,
  error: null,
  showDiff: false,
};

export function useRefineSection(planId: string, section: PlanSectionType) {
  const [state, setState] = useState<RefinementState>(initialState);
  const abortRef = useRef<AbortController | null>(null);

  const refine = useCallback(
    async (feedback: string, currentContent: string) => {
      if (state.isRefining || !feedback.trim()) return;

      track(EVENTS.PLAN_REFINE_START, { section, feedback_length: feedback.length });

      setState((prev) => ({
        ...prev,
        isRefining: true,
        error: null,
        streamingContent: "",
        originalContent: currentContent,
        refinedContent: null,
        showDiff: false,
      }));

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch("/api/agent/refine", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            plan_id: planId,
            section,
            feedback: feedback.trim(),
          }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const errorBody = await res.json().catch(() => null);
          throw new Error(errorBody?.error || `Refinement failed (${res.status})`);
        }

        if (!res.body) throw new Error("No response body");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let accumulated = "";
        let currentEvent = "message";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed === "") {
              currentEvent = "message";
              continue;
            }

            if (trimmed.startsWith("event:")) {
              currentEvent = trimmed.slice(6).trim();
              continue;
            }

            if (!trimmed.startsWith("data:")) continue;
            const dataStr = trimmed.slice(5).trim();

            try {
              const sseEvent: SSEEvent = {
                type: currentEvent as SSEEvent["type"],
                data: dataStr ? JSON.parse(dataStr) : {},
              };

              if (sseEvent.type === "message") {
                const msgData = sseEvent.data as SSEMessageData;
                if (msgData.is_chunk) {
                  accumulated += msgData.content;
                  setState((prev) => ({
                    ...prev,
                    streamingContent: accumulated,
                  }));
                } else {
                  accumulated = msgData.content;
                  setState((prev) => ({
                    ...prev,
                    streamingContent: "",
                    refinedContent: msgData.content,
                  }));
                }
              } else if (sseEvent.type === "error") {
                const errData = sseEvent.data as SSEErrorData;
                throw new Error(errData.message);
              } else if (sseEvent.type === "done") {
                setState((prev) => ({
                  ...prev,
                  isRefining: false,
                  streamingContent: "",
                  refinedContent: prev.refinedContent || accumulated,
                }));
                track(EVENTS.PLAN_REFINE_COMPLETE, { section });
              }
            } catch (parseErr) {
              if (parseErr instanceof Error && parseErr.message !== "message") {
                throw parseErr;
              }
            }
          }
        }

        // Ensure we finalize if stream ended without done event
        setState((prev) => {
          if (prev.isRefining) {
            return {
              ...prev,
              isRefining: false,
              streamingContent: "",
              refinedContent: prev.refinedContent || accumulated,
            };
          }
          return prev;
        });
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setState((prev) => ({
          ...prev,
          isRefining: false,
          error: err instanceof Error ? err.message : "Refinement failed",
          streamingContent: "",
        }));
      }
    },
    [planId, section, state.isRefining]
  );

  const toggleDiff = useCallback(() => {
    setState((prev) => {
      const newShowDiff = !prev.showDiff;
      if (newShowDiff) {
        track(EVENTS.PLAN_REFINE_VIEW_DIFF, { section });
      }
      return { ...prev, showDiff: newShowDiff };
    });
  }, [section]);

  const clearRefinement = useCallback(() => {
    abortRef.current?.abort();
    setState(initialState);
  }, []);

  const abort = useCallback(() => {
    abortRef.current?.abort();
    setState((prev) => ({
      ...prev,
      isRefining: false,
      streamingContent: "",
    }));
  }, []);

  return {
    isRefining: state.isRefining,
    streamingContent: state.streamingContent,
    refinedContent: state.refinedContent,
    originalContent: state.originalContent,
    error: state.error,
    showDiff: state.showDiff,

    refine,
    toggleDiff,
    clearRefinement,
    abort,
  };
}
