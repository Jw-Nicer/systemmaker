"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import { track, EVENTS } from "@/lib/analytics";
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
  | { type: "STREAM_MESSAGE"; content: string }
  | { type: "UPDATE_EXTRACTED"; extracted: ExtractedIntake }
  | { type: "PHASE_CHANGE"; from: ConversationPhase; to: ConversationPhase }
  | { type: "PLAN_SECTION"; section: string; label: string; content: string | null }
  | { type: "PLAN_COMPLETE"; plan_id: string; share_url: string }
  | { type: "SET_PLAN"; plan: PreviewPlan }
  | { type: "STREAM_DONE" }
  | { type: "ERROR"; message: string }
  | { type: "CLEAR_ERROR" }
  | { type: "RESET" };

interface ChatState extends ConversationState {
  isStreaming: boolean;
  error: string | null;
  streamingContent: string;
  share_url: string | null;
  streamedPlan: Partial<PreviewPlan>;
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

const initialState: ChatState = {
  phase: "gathering",
  messages: [],
  extracted: {},
  isStreaming: false,
  error: null,
  streamingContent: "",
  share_url: null,
  streamedPlan: {},
};

export function createInitialChatState(): ChatState {
  return {
    ...initialState,
    messages: [],
    extracted: {},
    streamedPlan: {},
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
      const assistantMsg = createMessage("assistant", action.content);
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

      if (action.content) {
        try {
          const parsed = JSON.parse(action.content) as unknown;
          nextStreamedPlan = {
            ...state.streamedPlan,
            [action.section]: parsed,
          } as Partial<PreviewPlan>;

          if (isPreviewPlanComplete(nextStreamedPlan)) {
            nextPlan = nextStreamedPlan;
          }
        } catch {
          // Keep the message even if section parsing fails.
        }
      }

      const sectionMsg = createMessage("assistant", action.content ?? "", {
        plan_section: action.section as ChatMessage["plan_section"],
      });
      return {
        ...state,
        messages: [...state.messages, sectionMsg],
        streamedPlan: nextStreamedPlan,
        plan: nextPlan,
      };
    }

    case "PLAN_COMPLETE":
      return {
        ...state,
        plan_id: action.plan_id,
        share_url: action.share_url,
        plan: isPreviewPlanComplete(state.streamedPlan)
          ? state.streamedPlan
          : state.plan,
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
        streamingContent: "",
      };

    case "CLEAR_ERROR":
      return { ...state, error: null };

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
      };

      // Include plan data for follow_up phase context
      if (current.phase === "follow_up" && current.plan) {
        body.plan = current.plan;
      }

      // Abort any existing stream
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

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

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

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
                    });
                  }
                  break;
                }

                case "phase_change": {
                  const phaseData = sseEvent.data as SSEPhaseChangeData;
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
                  dispatch({
                    type: "PLAN_COMPLETE",
                    plan_id: completeData.plan_id,
                    share_url: completeData.share_url,
                  });
                  track(EVENTS.AGENT_CHAT_PLAN_COMPLETE);
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

        // If stream ended without explicit done event
        if (stateRef.current.isStreaming) {
          dispatch({ type: "STREAM_DONE" });
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        dispatch({
          type: "ERROR",
          message:
            err instanceof Error ? err.message : "Connection failed",
        });
      }
    },
    [] // eslint-disable-line react-hooks/exhaustive-deps -- uses stateRef for stability
  );

  const setPlan = useCallback((plan: PreviewPlan) => {
    dispatch({ type: "SET_PLAN", plan });
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
    streamingContent: state.streamingContent,
    extracted: state.extracted,
    plan: state.plan,
    plan_id: state.plan_id,
    share_url: state.share_url,

    // Actions
    sendMessage,
    setPlan,
    clearError,
    reset,
    abort,
  };
}
