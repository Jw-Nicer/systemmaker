"use client";

import { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { TypingIndicator } from "./TypingIndicator";
import { ChatPlanCard } from "./ChatPlanCard";

/** Inline types — will migrate to types/chat.ts when Terminal 1 creates it */
export interface ChatMessage {
  id: string;
  role: "user" | "agent";
  content: string;
  timestamp: number;
  /** Plan section embedded in this message */
  planSection?: {
    title: string;
    content: string;
    index: number;
    isStreaming?: boolean;
  };
  /** Email capture form embedded in message */
  emailCapture?: boolean;
}

interface ChatMessagesProps {
  messages: ChatMessage[];
  isTyping: boolean;
  /** Currently streaming partial content */
  streamingContent?: string;
  /** Email capture state */
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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
  }, [messages.length, isTyping, reduced]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
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

      {streamingContent && (
        <div className="flex justify-start">
          <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-surface-light border border-border px-4 py-2.5 text-sm leading-relaxed text-foreground">
            <p className="whitespace-pre-wrap">{streamingContent}</p>
          </div>
        </div>
      )}

      {isTyping && !streamingContent && (
        <div className="flex justify-start">
          <div className="rounded-2xl rounded-bl-md bg-surface-light border border-border max-w-[85%]">
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
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? "rounded-br-md bg-primary text-background"
            : "rounded-bl-md bg-surface-light border border-border text-foreground"
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
      transition={{ duration: 0.2 }}
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
      <div className="mt-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
        <p className="text-green-400 text-sm font-medium">Sent to your inbox!</p>
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
        className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:border-primary focus:outline-none"
      />
      <input
        type="email"
        value={email}
        onChange={(e) => onEmailChange(e.target.value)}
        placeholder="you@company.com"
        className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:border-primary focus:outline-none"
      />
      <button
        onClick={onSubmit}
        disabled={status === "sending" || !name.trim() || !email.trim()}
        className="w-full px-4 py-2 rounded-lg bg-primary text-background text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {status === "sending" ? "Sending..." : "Email me this plan"}
      </button>
      {status === "error" && (
        <p className="text-red-400 text-xs text-center">
          Failed to send — please try again.
        </p>
      )}
    </div>
  );
}
