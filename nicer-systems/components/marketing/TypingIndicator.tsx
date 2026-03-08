"use client";

export function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-5 py-4" aria-label="Agent is typing">
      <span className="typing-dot h-2 w-2 rounded-full bg-[#7d8c67]" style={{ animationDelay: "0ms" }} />
      <span className="typing-dot h-2 w-2 rounded-full bg-[#7d8c67]" style={{ animationDelay: "150ms" }} />
      <span className="typing-dot h-2 w-2 rounded-full bg-[#7d8c67]" style={{ animationDelay: "300ms" }} />

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
