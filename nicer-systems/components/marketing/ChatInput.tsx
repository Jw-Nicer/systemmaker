"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSend,
  disabled = false,
  placeholder = "Type a message...",
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, []);

  useEffect(() => {
    autoResize();
  }, [value, autoResize]);

  function handleSubmit() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className="flex items-end gap-2 border-t border-[#c9cfbf] bg-[linear-gradient(180deg,#e9e2d3,#ddd4c2)] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.32)] sm:gap-3 sm:px-4">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={1}
        className="flex-1 resize-none rounded-[var(--radius-md)] border border-[#c9d2bf] bg-[#f8f4ea] px-4 py-2.5 text-sm text-[#23301f] placeholder:text-[#6f7868] focus-organic disabled:opacity-50"
      />
      <button
        onClick={handleSubmit}
        disabled={disabled || !value.trim()}
        className="shrink-0 rounded-full bg-[#55682a] px-4 py-2.5 text-sm font-medium text-[#f4efe5] shadow-[0_10px_24px_rgba(85,104,42,0.3)] transition-all hover:bg-[#4a5b24] active:scale-[0.97] disabled:opacity-30"
        aria-label="Send message"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          className="inline-block"
        >
          <path
            d="M14.5 1.5L7 9M14.5 1.5L10 14.5L7 9M14.5 1.5L1.5 6L7 9"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}
