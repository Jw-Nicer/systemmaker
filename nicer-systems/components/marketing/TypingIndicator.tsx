"use client";

export function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-4 py-3" aria-label="Agent is typing">
      <span className="typing-dot w-2 h-2 rounded-full bg-muted" style={{ animationDelay: "0ms" }} />
      <span className="typing-dot w-2 h-2 rounded-full bg-muted" style={{ animationDelay: "150ms" }} />
      <span className="typing-dot w-2 h-2 rounded-full bg-muted" style={{ animationDelay: "300ms" }} />

      <style jsx>{`
        .typing-dot {
          animation: typing-bounce 1.2s ease-in-out infinite;
        }
        @keyframes typing-bounce {
          0%, 60%, 100% {
            opacity: 0.3;
            transform: translateY(0);
          }
          30% {
            opacity: 1;
            transform: translateY(-4px);
          }
        }
      `}</style>
    </div>
  );
}
