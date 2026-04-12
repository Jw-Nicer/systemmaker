"use client";

import { useState, useEffect } from "react";
import { ChatMessages } from "./ChatMessages";
import { ChatInput } from "./ChatInput";
import { PlanBuildProgress } from "./PlanBuildProgress";
import { track, EVENTS } from "@/lib/analytics";
import { useSSEChat } from "@/hooks/useSSEChat";
import type { PreviewPlan } from "@/types/preview-plan";
import type { ChatMessage } from "@/types/chat";

// ─── Component ──────────────────────────────────────────────
interface AgentChatProps {
  /** Optional callback when plan completes (for parent to wire share/save) */
  onPlanComplete?: (plan: PreviewPlan, planId: string) => void;
}

export function AgentChat({ onPlanComplete }: AgentChatProps) {
  const chat = useSSEChat();
  const [emailForm, setEmailForm] = useState({
    name: "",
    email: "",
    status: "idle" as "idle" | "sending" | "sent" | "error",
  });

  // Welcome message displayed locally (not sent to API)
  // Use 0 as timestamp to avoid SSR/client hydration mismatch (never displayed)
  const welcomeMessage: ChatMessage = {
    id: "welcome",
    role: "assistant",
    content:
      "Hi! I'm the Nicer Systems preview-plan agent. Tell me about an operational bottleneck in your business, and I'll map a draft workflow, KPIs, alerts, and next actions.\n\nWhat industry are you in?",
    timestamp: 0,
  };

  // Combine welcome message with chat messages
  const allMessages = [welcomeMessage, ...chat.messages];

  // Track plan completion
  useEffect(() => {
    if (chat.plan_id && chat.plan) {
      onPlanComplete?.(chat.plan, chat.plan_id);
    }
  }, [chat.plan_id, chat.plan, onPlanComplete]);

  async function handleEmailSubmit() {
    setEmailForm((f) => ({ ...f, status: "sending" }));
    try {
      const res = await fetch("/api/agent/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: emailForm.name,
          email: emailForm.email,
          preview_plan: chat.plan,
          lead_id: chat.lead_id,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      setEmailForm((f) => ({ ...f, status: "sent" }));
      // Sync the captured contact info into chat state so any follow-up
      // request to /api/agent/chat carries name + email and the agent stops
      // re-asking for them in the conversation.
      chat.markEmailCaptured(emailForm.name, emailForm.email);
      track(EVENTS.PREVIEW_PLAN_EMAIL_CAPTURE, {
        lead_id: chat.lead_id,
        plan_id: chat.plan_id,
        source: "agent_chat",
      });
      track(EVENTS.CTA_CLICK_PREVIEW_PLAN);
    } catch {
      setEmailForm((f) => ({ ...f, status: "error" }));
    }
  }

  const inputDisabled = chat.isStreaming || chat.phase === "building";

  // Map canonical messages to ChatMessages component format.
  // For plan_section messages we hide the raw JSON `content` from the bubble
  // body (ChatPlanCard parses it itself per sectionType) so the chat never
  // shows a wall of stringified JSON.
  const displayMessages = allMessages.map((msg) => ({
    id: msg.id,
    role: (msg.role === "assistant" ? "agent" : msg.role) as "user" | "agent",
    content: msg.plan_section ? "" : msg.content,
    timestamp: msg.timestamp,
    planSection: msg.plan_section
      ? {
          title: msg.plan_section_label || msg.plan_section,
          content: msg.content,
          sectionType: msg.plan_section,
          index: 0,
        }
      : undefined,
    emailCapture: msg.email_capture,
    shareLink: msg.share_link,
  }));

  // Show email capture in complete or follow_up phases, unless email was auto-sent.
  // Keep it mounted after submit so EmailCaptureInline can render its own
  // "Plan sent! Check your inbox." confirmation + booking CTA instead of vanishing
  // and leaving the original "want me to email it to you?" message unanswered.
  const showEmailCapture =
    (chat.phase === "complete" || chat.phase === "follow_up") &&
    !chat.email_auto_sent;

  return (
    <div className="flex h-[380px] min-h-0 flex-col sm:h-[460px]">
      {chat.phase === "building" && (
        <div className="shrink-0 px-3 pt-3 sm:px-5">
          <PlanBuildProgress
            completedStages={chat.completedStages}
            failedStages={chat.failedStages}
          />
        </div>
      )}
      <ChatMessages
        messages={displayMessages}
        isTyping={chat.isStreaming}
        streamingContent={chat.streamingContent}
        emailForm={
          showEmailCapture
            ? {
                name: emailForm.name,
                email: emailForm.email,
                status: emailForm.status,
                onNameChange: (name) =>
                  setEmailForm((f) => ({ ...f, name })),
                onEmailChange: (email) =>
                  setEmailForm((f) => ({ ...f, email })),
                onSubmit: handleEmailSubmit,
              }
            : undefined
        }
      />

      {chat.isReconnecting && (
        <div className="flex items-center gap-2 border-t border-yellow-500/20 bg-yellow-500/10 px-4 py-2 text-xs text-yellow-600">
          <span className="block h-2 w-2 animate-pulse rounded-full bg-yellow-500" />
          Connection lost — resuming...
        </div>
      )}

      {chat.error && (
        <div className="flex items-center justify-between gap-2 border-t border-red-500/20 bg-red-500/10 px-4 py-2 text-xs text-red-400">
          <span>{chat.error}</span>
          <div className="flex shrink-0 gap-2">
            {chat.isTimeout && (
              <button
                onClick={() => {
                  chat.clearError();
                  // Re-send the last user message to retry
                  const lastUserMsg = [...chat.messages].reverse().find((m) => m.role === "user");
                  if (lastUserMsg) chat.sendMessage(lastUserMsg.content);
                }}
                className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/20"
              >
                Try again
              </button>
            )}
            <button
              onClick={chat.reset}
              className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/20"
            >
              Start over
            </button>
          </div>
        </div>
      )}

      {!chat.error && chat.messages.filter((m) => m.role === "user").length >= 2 && chat.phase !== "building" && (
        <div className="flex justify-end border-t border-[var(--border-light)] px-4 py-1.5">
          <button
            onClick={chat.reset}
            className="rounded-full px-3 py-1 text-[11px] font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--cream-card)] hover:text-[var(--text-body)]"
          >
            Start over
          </button>
        </div>
      )}

      <ChatInput
        onSend={chat.sendMessage}
        disabled={inputDisabled}
        placeholder={
          chat.phase === "building"
            ? "Building your plan..."
            : chat.phase === "complete" || chat.phase === "follow_up"
              ? "Ask a follow-up question..."
              : "Type your answer..."
        }
      />
    </div>
  );
}
