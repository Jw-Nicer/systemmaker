"use client";

import Link from "next/link";
import { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { TypingIndicator } from "./TypingIndicator";
import { ChatPlanCard } from "./ChatPlanCard";

export interface ChatMessage {
  id: string;
  role: "user" | "agent";
  content: string;
  timestamp: number;
  planSection?: {
    title: string;
    content: string;
    index: number;
    isStreaming?: boolean;
  };
  emailCapture?: boolean;
}

interface ChatMessagesProps {
  messages: ChatMessage[];
  isTyping: boolean;
  streamingContent?: string;
  emailForm?: {
    name: string;
    email: string;
    status: "idle" | "sending" | "sent" | "error";
    onNameChange: (name: string) => void;
    onEmailChange: (email: string) => void;
    onSubmit: () => void;
  };
}

export function ChatMessages({ messages, isTyping, streamingContent, emailForm }: ChatMessagesProps) {
  const reduced = useReducedMotion();
  const bottomRef = useRef<HTMLDivElement>(null);
  const showScaffold = messages.length <= 1 && !isTyping && !streamingContent;
  const idlePreviewCards = [
    {
      title: "Workflow map",
      description: "Stage-by-stage handoffs and ownership",
      tag: "handoff",
    },
    {
      title: "KPI set",
      description: "Cycle time, stuck work, and throughput",
      tag: "metrics",
    },
  ];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
  }, [messages.length, isTyping, reduced]);

  return (
    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 py-4 sm:px-5 sm:py-5">
      <AnimatePresence initial={false}>
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            reduced={reduced}
            emailForm={msg.emailCapture ? emailForm : undefined}
          />
        ))}
      </AnimatePresence>

      {showScaffold && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {idlePreviewCards.map(({ title, description, tag }) => (
            <div
              key={title}
              className="rounded-[22px] border border-[#ccd2c4] bg-[linear-gradient(180deg,rgba(255,255,255,0.84),rgba(244,239,229,0.94))] px-4 py-4 shadow-[0_12px_28px_rgba(59,69,43,0.08)]"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] uppercase tracking-[0.12em] text-[#687562]">
                  Preview output
                </p>
                <span className="rounded-full border border-[#8a966d]/25 bg-[#eef3e6] px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-[#516236]">
                  {tag}
                </span>
              </div>
              <p className="mt-3 text-sm font-semibold text-[#1d2418]">{title}</p>
              <p className="mt-1 text-sm leading-6 text-[#4d5b47]">{description}</p>
            </div>
            ))}
          </div>
          <div className="rounded-[24px] border border-dashed border-[#cfd4c5] bg-[linear-gradient(180deg,rgba(245,241,233,0.72),rgba(237,232,220,0.92))] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.42)]">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] uppercase tracking-[0.14em] text-[#72806c]">
                Upcoming sections
              </p>
              <span className="text-[10px] uppercase tracking-[0.16em] text-[#8b8c7a]">
                staged output
              </span>
            </div>
            <div className="mt-3 space-y-2.5">
              {[
                "Workflow assumptions and handoff risks",
                "Recommended KPI dashboard and review cadence",
                "Alerts, owners, and next-action summary",
              ].map((label, index) => (
                <div
                  key={label}
                  className="flex items-center gap-3 rounded-[16px] border border-[#dde1d4] bg-white/42 px-3 py-2.5"
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#e8eedf] text-[10px] font-medium text-[#5b6b3a]">
                    {index + 1}
                  </span>
                  <div className="h-2.5 flex-1 rounded-full bg-[linear-gradient(90deg,rgba(116,136,72,0.22),rgba(188,195,170,0.38))]" />
                  <span className="hidden text-[11px] text-[#697360] sm:inline">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {streamingContent && (
        <div className="flex justify-start">
          <div className="max-w-[92%] rounded-[24px] rounded-bl-md border border-[#cfd8c9] bg-[linear-gradient(180deg,#faf7ef,#f1ecdf)] px-4 py-3 text-sm leading-6 text-[#283123] shadow-[0_14px_30px_rgba(56,67,45,0.08)] sm:max-w-[85%] sm:px-5 sm:py-3.5 sm:text-base sm:leading-7">
            <p className="whitespace-pre-wrap">{streamingContent}</p>
          </div>
        </div>
      )}

      {isTyping && !streamingContent && (
        <div className="flex justify-start">
          <div className="max-w-[92%] rounded-[24px] rounded-bl-md border border-[#cfd8c9] bg-[linear-gradient(180deg,#faf7ef,#f1ecdf)] shadow-[0_14px_30px_rgba(56,67,45,0.08)] sm:max-w-[85%]">
            <TypingIndicator />
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}

function MessageBubble({
  message,
  reduced,
  emailForm,
}: {
  message: ChatMessage;
  reduced: boolean;
  emailForm?: ChatMessagesProps["emailForm"];
}) {
  const isUser = message.role === "user";

  const bubble = (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[92%] rounded-[24px] px-4 py-3 text-sm leading-6 sm:max-w-[85%] sm:px-5 sm:py-3.5 sm:text-base sm:leading-7 ${
          isUser
            ? "rounded-br-md bg-gradient-to-r from-primary to-secondary text-background shadow-[var(--shadow-soft-sm)]"
            : "rounded-bl-md border border-[#cfd8c9] bg-[linear-gradient(180deg,#faf7ef,#f1ecdf)] text-[#273022] shadow-[0_14px_30px_rgba(56,67,45,0.08)]"
        }`}
      >
        {message.content && (
          <p className="whitespace-pre-wrap">{message.content}</p>
        )}

        {message.planSection && (
          <div className="mt-2">
            <ChatPlanCard
              title={message.planSection.title}
              content={message.planSection.content}
              index={message.planSection.index}
              isStreaming={message.planSection.isStreaming}
            />
          </div>
        )}

        {message.emailCapture && emailForm && (
          <EmailCaptureInline {...emailForm} />
        )}
      </div>
    </div>
  );

  if (reduced) return bubble;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
    >
      {bubble}
    </motion.div>
  );
}

function EmailCaptureInline({
  name,
  email,
  status,
  onNameChange,
  onEmailChange,
  onSubmit,
}: NonNullable<ChatMessagesProps["emailForm"]>) {
  if (status === "sent") {
    return (
      <div className="mt-3 rounded-[var(--radius-sm)] border border-green-500/20 bg-green-500/10 p-3 text-center">
        <p className="text-sm font-medium text-green-700">Preview plan sent to your inbox.</p>
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-2">
      <input
        type="text"
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        placeholder="Your name"
        className="w-full rounded-[var(--radius-sm)] border border-[#d8d0c2] bg-white/80 px-3 py-2 text-sm text-[#273022] focus-organic"
      />
      <input
        type="email"
        value={email}
        onChange={(e) => onEmailChange(e.target.value)}
        placeholder="you@company.com"
        className="w-full rounded-[var(--radius-sm)] border border-[#d8d0c2] bg-white/80 px-3 py-2 text-sm text-[#273022] focus-organic"
      />
      <button
        onClick={onSubmit}
        disabled={status === "sending" || !name.trim() || !email.trim()}
        className="w-full px-4 py-2 rounded-full bg-gradient-to-r from-primary to-secondary text-background text-sm font-medium hover:shadow-[var(--shadow-soft-sm)] active:scale-[0.97] transition-all disabled:opacity-50"
      >
        {status === "sending" ? "Sending..." : "Email me the preview plan"}
      </button>
      <p className="text-center text-[11px] leading-5 text-[#65705d]">
        We use these details to send your plan and follow up on your request.
        {" "}
        <Link
          href="/privacy"
          className="text-[#38552d] underline decoration-[#93a071] underline-offset-4"
        >
          Privacy Policy
        </Link>
      </p>
      {status === "error" && (
        <p className="text-xs text-center text-red-500">
          Failed to send — please try again.
        </p>
      )}
    </div>
  );
}
