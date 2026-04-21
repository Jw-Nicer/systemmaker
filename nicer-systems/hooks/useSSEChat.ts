"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import { track, EVENTS } from "@/lib/analytics";
import { getCurrentExperimentAssignments } from "@/lib/experiments/assignments";
import { saveEditToken } from "@/lib/plans/edit-token-storage";
import type {
  ChatMessage,
  ConversationPhase,
  ConversationState,
  ExtractedIntake,
  SSEEvent,
  SSEMessageData,
  SSEPhaseChangeData,
  SSEPlanSectionData,
  SSEPlanCompleteData,
  SSEErrorData,
} from "@/types/chat";
import type { PreviewPlan } from "@/types/preview-plan";

// --- State machine ---

type ChatAction =
  | { type: "SEND_MESSAGE"; message: string }
  | { type: "STREAM_CHUNK"; content: string }
  | { type: "STREAM_MESSAGE"; content: string; email_capture?: boolean; share_link?: string }
  | { type: "UPDATE_EXTRACTED"; extracted: ExtractedIntake }
  | { type: "PHASE_CHANGE"; from: ConversationPhase; to: ConversationPhase }
  | { type: "PLAN_SECTION"; section: string; label: string; content: string | null }
  | { type: "PLAN_COMPLETE"; plan_id: string; lead_id?: string; share_url: string; email_auto_sent?: boolean }
  | { type: "MARK_EMAIL_CAPTURED"; name: string; email: string }
  | { type: "SET_PLAN"; plan: PreviewPlan }
  | { type: "STREAM_DONE" }
  | { type: "ERROR"; message: string; isTimeout?: boolean }
  | { type: "CLEAR_ERROR" }
  | { type: "RECONNECTING" }
  | { type: "REFINEMENT_SUGGESTION"; section: string | null; feedback: string }
  | { type: "CLEAR_REFINEMENT_SUGGESTION" }
  | { type: "RESET" };

interface ChatState extends ConversationState {
  isStreaming: boolean;
  error: string | null;
  isTimeout: boolean;
  streamingContent: string;
  share_url: string | null;
  streamedPlan: Partial<PreviewPlan>;
  email_auto_sent: boolean;
  /** Stages that have completed during the building phase (2A progress tracker). */
  completedStages: Set<string>;
  /** Stages that failed during the building phase (2A progress tracker). */
  failedStages: Set<string>;
  /** True while attempting automatic SSE reconnection (3E). */
  isReconnecting: boolean;
  /** Number of auto-reconnect attempts in the current building phase (3E). */
  reconnectAttempts: number;
  /** Refinement suggestion detected in follow_up phase (5C). */
  refinementSuggestion: { section: string | null; feedback: string } | null;
}

export function isPreviewPlanComplete(
  plan: Partial<PreviewPlan>
): plan is PreviewPlan {
  return Boolean(
    plan.intake &&
      plan.workflow &&
      plan.automation &&
      plan.dashboard &&
      plan.ops_pulse
  );
}

function createMessage(
  role: ChatMessage["role"],
  content: string,
  extra?: Partial<ChatMessage>
): ChatMessage {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    content,
    timestamp: Date.now(),
    ...extra,
  };
}

// Stall detection — split into "first chunk" vs "inter-chunk" so cold-start
// latency doesn't get mistaken for a stalled stream. Cold gathering turns can
// legitimately take 25-35s for the first byte (Gemini queue + extraction), but
// once chunks start flowing they should arrive within a few seconds of each
// other. The building phase has its own timer because the 6-stage pipeline
// runs 60-120s end-to-end and needs much more headroom.
const SSE_FIRST_CHUNK_TIMEOUT_MS = 60_000; // 60s waiting for the first byte
const SSE_INTER_CHUNK_TIMEOUT_MS = 15_000; // 15s between chunks once data flows
const SSE_BUILDING_TIMEOUT_MS = 180_000;   // 3 min for the building phase

const initialState: ChatState = {
  phase: "gathering",
  messages: [],
  extracted: {},
  isStreaming: false,
  error: null,
  isTimeout: false,
  streamingContent: "",
  share_url: null,
  streamedPlan: {},
  email_auto_sent: false,
  completedStages: new Set(),
  failedStages: new Set(),
  isReconnecting: false,
  reconnectAttempts: 0,
  refinementSuggestion: null,
};

export function createInitialChatState(): ChatState {
  return {
    ...initialState,
    messages: [],
    extracted: {},
    streamedPlan: {},
    completedStages: new Set(),
    failedStages: new Set(),
  };
}

export function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case "SEND_MESSAGE": {
      const userMsg = createMessage("user", action.message);
      return {
        ...state,
        messages: [...state.messages, userMsg],
        isStreaming: true,
        error: null,
        streamingContent: "",
      };
    }

    case "STREAM_CHUNK":
      return {
        ...state,
        streamingContent: state.streamingContent + action.content,
      };

    case "STREAM_MESSAGE": {
      // Full message received — add as assistant message
      const assistantMsg = createMessage("assistant", action.content, {
        email_capture: action.email_capture,
        share_link: action.share_link,
      });
      return {
        ...state,
        messages: [...state.messages, assistantMsg],
        streamingContent: "",
      };
    }

    case "UPDATE_EXTRACTED":
      return {
        ...state,
        extracted: {
          ...state.extracted,
          ...action.extracted,
        },
      };

    case "PHASE_CHANGE":
      return {
        ...state,
        phase: action.to,
      };

    case "PLAN_SECTION": {
      let nextPlan = state.plan;
      let nextStreamedPlan = state.streamedPlan;
      const nextCompleted = new Set(state.completedStages);

      if (action.content) {
        try {
          const parsed = JSON.parse(action.content) as unknown;
          // Map server section names to PreviewPlan field names
          const planKey = action.section === "implementation_sequencer" ? "roadmap"
            : action.section === "proposal_writer" ? "proposal"
            : action.section;
          nextStreamedPlan = {
            ...state.streamedPlan,
            [planKey]: parsed,
          } as Partial<PreviewPlan>;

          if (isPreviewPlanComplete(nextStreamedPlan)) {
            nextPlan = nextStreamedPlan;
          }

          // Track stage completion for the progress tracker (2A)
          nextCompleted.add(action.section);
        } catch {
          // Keep the message even if section parsing fails.
        }
      }

      const sectionMsg = createMessage("assistant", action.content ?? "", {
        plan_section: action.section as ChatMessage["plan_section"],
        plan_section_label: action.label,
      });
      return {
        ...state,
        messages: [...state.messages, sectionMsg],
        streamedPlan: nextStreamedPlan,
        plan: nextPlan,
        completedStages: nextCompleted,
      };
    }

    case "PLAN_COMPLETE":
      return {
        ...state,
        plan_id: action.plan_id,
        lead_id: action.lead_id,
        share_url: action.share_url,
        email_auto_sent: action.email_auto_sent ?? false,
        plan: isPreviewPlanComplete(state.streamedPlan)
          ? state.streamedPlan
          : state.plan,
      };

    case "MARK_EMAIL_CAPTURED":
      // User submitted the inline email-capture form. Treat the plan as
      // delivered and fold the name/email into extracted state so subsequent
      // follow-up requests carry them server-side and the agent stops asking.
      return {
        ...state,
        email_auto_sent: true,
        extracted: {
          ...state.extracted,
          name: action.name || state.extracted.name,
          email: action.email || state.extracted.email,
        },
      };

    case "SET_PLAN":
      return {
        ...state,
        plan: action.plan,
        streamedPlan: action.plan,
      };

    case "STREAM_DONE": {
      // If there's buffered streaming content, flush it as a message
      const msgs = [...state.messages];
      if (state.streamingContent.trim()) {
        msgs.push(createMessage("assistant", state.streamingContent));
      }
      return {
        ...state,
        messages: msgs,
        isStreaming: false,
        streamingContent: "",
      };
    }

    case "ERROR":
      return {
        ...state,
        isStreaming: false,
        error: action.message,
        isTimeout: action.isTimeout ?? false,
        streamingContent: "",
      };

    case "CLEAR_ERROR":
      return { ...state, error: null, isTimeout: false };

    case "RECONNECTING":
      return {
        ...state,
        isReconnecting: true,
        reconnectAttempts: state.reconnectAttempts + 1,
        error: null,
        isTimeout: false,
        isStreaming: true,
      };

    case "REFINEMENT_SUGGESTION":
      return {
        ...state,
        refinementSuggestion: { section: action.section, feedback: action.feedback },
      };

    case "CLEAR_REFINEMENT_SUGGESTION":
      return { ...state, refinementSuggestion: null };

    case "RESET":
      return { ...initialState };

    default:
      return state;
  }
}

// --- SSE parser ---

function parseSSELine(line: string): { event?: string; data?: string } | null {
  if (line.startsWith("event:")) {
    return { event: line.slice(6).trim() };
  }
  if (line.startsWith("data:")) {
    return { data: line.slice(5).trim() };
  }
  return null;
}

// --- Hook ---

export function useSSEChat() {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const abortRef = useRef<AbortController | null>(null);
  const hasTrackedStart = useRef(false);
  // Use ref for state to keep sendMessage stable (avoids re-renders of ChatInput)
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; });

  // Cleanup: abort any in-flight stream when the component unmounts
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const sendMessage = useCallback(
    async (message: string) => {
      const current = stateRef.current;
      if (current.isStreaming || !message.trim()) return;

      // Track first message
      if (!hasTrackedStart.current) {
        track(EVENTS.AGENT_CHAT_START);
        hasTrackedStart.current = true;
      }
      track(EVENTS.AGENT_CHAT_MESSAGE, { phase: current.phase });

      dispatch({ type: "SEND_MESSAGE", message: message.trim() });

      // Prepare request body
      const body: Record<string, unknown> = {
        message: message.trim(),
        history: current.messages.slice(-20), // Keep last 20 for context window
        phase: current.phase,
        extracted: current.extracted,
        landing_path:
          typeof window !== "undefined" ? window.location.pathname : undefined,
      };

      const experimentAssignments = getCurrentExperimentAssignments();
      if (experimentAssignments.length > 0) {
        body.experiment_assignments = experimentAssignments;
      }

      // Include plan data for follow_up phase context
      if (current.phase === "follow_up" && current.plan) {
        body.plan = current.plan;
      }

      // Abort any existing stream
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      let timeoutId: ReturnType<typeof setTimeout> | null = null;
      try {
        const res = await fetch("/api/agent/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        if (!res.ok) {
          const errorBody = await res.json().catch(() => null);
          throw new Error(
            errorBody?.error || `Request failed (${res.status})`
          );
        }

        if (!res.body) {
          throw new Error("No response body");
        }

        // Parse SSE stream
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let currentEvent = "message";
        const MAX_BUFFER_SIZE = 64 * 1024; // 64KB

        // Timeout: stall detection adapts to phase AND whether the first
        // chunk has arrived yet.
        // - building: 3 minutes flat (pipeline runs 6 stages with Gemini calls)
        // - gathering/confirming/follow_up:
        //     • 60s waiting for the first byte (cold-start friendly)
        //     • 15s between chunks once data starts flowing
        let isBuilding = stateRef.current.phase === "building";
        let firstChunkSeen = false;
        const getTimeoutMs = () => {
          if (isBuilding) return SSE_BUILDING_TIMEOUT_MS;
          return firstChunkSeen ? SSE_INTER_CHUNK_TIMEOUT_MS : SSE_FIRST_CHUNK_TIMEOUT_MS;
        };
        const resetTimeout = () => {
          if (timeoutId) clearTimeout(timeoutId);
          timeoutId = setTimeout(() => {
            controller.abort();
            dispatch({
              type: "ERROR",
              message: isBuilding
                ? "Plan generation is taking longer than expected. Try again?"
                : "The agent is taking longer than expected. Try again?",
              isTimeout: true,
            });
          }, getTimeoutMs());
        };
        resetTimeout();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          // First successful read flips us into the tighter inter-chunk window.
          if (!firstChunkSeen) firstChunkSeen = true;
          resetTimeout();

          buffer += decoder.decode(value, { stream: true });
          if (buffer.length > MAX_BUFFER_SIZE) {
            buffer = buffer.slice(-MAX_BUFFER_SIZE);
          }
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();

            if (trimmed === "") {
              // Empty line = event boundary, reset event type
              currentEvent = "message";
              continue;
            }

            const parsed = parseSSELine(trimmed);
            if (!parsed) continue;

            if (parsed.event) {
              currentEvent = parsed.event;
              continue;
            }

            if (parsed.data === undefined) continue;

            // Handle based on event type
            try {
              const sseEvent: SSEEvent = {
                type: currentEvent as SSEEvent["type"],
                data: parsed.data ? JSON.parse(parsed.data) : {},
              };

              switch (sseEvent.type) {
                case "message": {
                  const msgData = sseEvent.data as SSEMessageData;
                  if (msgData.is_extraction_update && msgData.extracted) {
                    dispatch({
                      type: "UPDATE_EXTRACTED",
                      extracted: msgData.extracted,
                    });
                    break;
                  }

                  if (msgData.is_chunk) {
                    dispatch({
                      type: "STREAM_CHUNK",
                      content: msgData.content,
                    });
                  } else {
                    dispatch({
                      type: "STREAM_MESSAGE",
                      content: msgData.content,
                      email_capture: msgData.email_capture,
                      share_link: msgData.share_link,
                    });
                  }
                  break;
                }

                case "phase_change": {
                  const phaseData = sseEvent.data as SSEPhaseChangeData;
                  isBuilding = phaseData.to === "building";
                  resetTimeout();
                  dispatch({
                    type: "PHASE_CHANGE",
                    from: phaseData.from,
                    to: phaseData.to,
                  });
                  if (phaseData.to === "building") {
                    track(EVENTS.AGENT_CHAT_PLAN_START);
                  }
                  if (phaseData.to === "follow_up") {
                    track(EVENTS.AGENT_CHAT_FOLLOW_UP);
                  }
                  break;
                }

                case "plan_section": {
                  const sectionData = sseEvent.data as SSEPlanSectionData;
                  dispatch({
                    type: "PLAN_SECTION",
                    section: sectionData.section,
                    label: sectionData.label,
                    content: sectionData.content,
                  });
                  break;
                }

                case "plan_complete": {
                  const completeData = sseEvent.data as SSEPlanCompleteData;
                  if (completeData.plan_id && completeData.edit_token) {
                    saveEditToken(completeData.plan_id, completeData.edit_token);
                  }
                  dispatch({
                    type: "PLAN_COMPLETE",
                    plan_id: completeData.plan_id,
                    lead_id: completeData.lead_id,
                    share_url: completeData.share_url,
                    email_auto_sent: completeData.email_auto_sent,
                  });
                  track(EVENTS.AGENT_CHAT_PLAN_COMPLETE);
                  break;
                }

                case "refinement_suggestion": {
                  const refData = sseEvent.data as unknown as { section: string | null; feedback: string };
                  dispatch({
                    type: "REFINEMENT_SUGGESTION",
                    section: refData.section,
                    feedback: refData.feedback,
                  });
                  break;
                }

                case "error": {
                  const errorData = sseEvent.data as SSEErrorData;
                  dispatch({ type: "ERROR", message: errorData.message });
                  break;
                }

                case "done":
                  dispatch({ type: "STREAM_DONE" });
                  break;
              }
            } catch {
              // Malformed JSON — skip this event
            }
          }
        }

        // Clear timeout when stream ends normally
        if (timeoutId) clearTimeout(timeoutId);

        // If stream ended without explicit done event
        if (stateRef.current.isStreaming) {
          dispatch({ type: "STREAM_DONE" });
        }
      } catch (err) {
        if (timeoutId) clearTimeout(timeoutId);
        if ((err as Error).name === "AbortError") return;

        // 3E — Auto-reconnect during building phase (max 2 retries)
        const MAX_RECONNECT = 2;
        const currentState = stateRef.current;
        if (
          currentState.phase === "building" &&
          currentState.reconnectAttempts < MAX_RECONNECT
        ) {
          dispatch({ type: "RECONNECTING" });
          // Delay 2s before retrying — server dedup cache may already have
          // the completed plan from the first attempt.
          await new Promise((r) => setTimeout(r, 2000));
          // Re-send the same message (sendMessage will be called by the
          // component via the retry flow). For now, dispatch the error
          // only if we've exhausted retries — the component shows a banner
          // while isReconnecting is true and the user can trigger retry.
          const lastUserMsg = [...currentState.messages]
            .reverse()
            .find((m) => m.role === "user");
          if (lastUserMsg) {
            // Recursive retry — sendMessage is stable
            sendMessage(lastUserMsg.content);
            return;
          }
        }

        dispatch({
          type: "ERROR",
          message:
            err instanceof Error ? err.message : "Connection failed",
        });
      }
    },
    []
  );

  const setPlan = useCallback((plan: PreviewPlan) => {
    dispatch({ type: "SET_PLAN", plan });
  }, []);

  const markEmailCaptured = useCallback((name: string, email: string) => {
    dispatch({ type: "MARK_EMAIL_CAPTURED", name, email });
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: "CLEAR_ERROR" });
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    hasTrackedStart.current = false;
    dispatch({ type: "RESET" });
  }, []);

  const abort = useCallback(() => {
    abortRef.current?.abort();
    dispatch({ type: "STREAM_DONE" });
  }, []);

  return {
    // State
    messages: state.messages,
    phase: state.phase,
    isStreaming: state.isStreaming,
    error: state.error,
    isTimeout: state.isTimeout,
    streamingContent: state.streamingContent,
    extracted: state.extracted,
    plan: state.plan,
    plan_id: state.plan_id,
    lead_id: state.lead_id,
    share_url: state.share_url,
    email_auto_sent: state.email_auto_sent,
    completedStages: state.completedStages,
    failedStages: state.failedStages,
    isReconnecting: state.isReconnecting,
    refinementSuggestion: state.refinementSuggestion,

    // Actions
    sendMessage,
    setPlan,
    markEmailCaptured,
    clearError,
    clearRefinementSuggestion: useCallback(
      () => dispatch({ type: "CLEAR_REFINEMENT_SUGGESTION" }),
      []
    ),
    reset,
    abort,
  };
}
