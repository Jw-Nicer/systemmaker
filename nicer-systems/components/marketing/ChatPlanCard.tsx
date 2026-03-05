"use client";

interface ChatPlanCardProps {
  title: string;
  /** Markdown or plain text content for this plan section */
  content: string;
  /** True when section is still streaming in */
  isStreaming?: boolean;
  /** Section index for visual ordering */
  index?: number;
}

const SECTION_ICONS: Record<string, string> = {
  "Suggested Scope": "📋",
  "Workflow Map": "🔀",
  "Automations & Alerts": "⚡",
  "Dashboard KPIs": "📊",
  "Ops Pulse": "📡",
};

export function ChatPlanCard({
  title,
  content,
  isStreaming = false,
  index,
}: ChatPlanCardProps) {
  const icon = SECTION_ICONS[title] ?? "📄";

  return (
    <div className="rounded-lg border border-primary/20 bg-surface overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-surface-light/50">
        <span className="text-sm" aria-hidden>
          {icon}
        </span>
        {typeof index === "number" && (
          <span className="text-xs text-muted font-mono">
            {index + 1}/5
          </span>
        )}
        <span className="text-sm font-medium flex-1">{title}</span>
        {isStreaming && (
          <span className="text-xs text-primary animate-pulse">
            generating...
          </span>
        )}
      </div>
      <div className="px-4 py-3 text-sm text-muted leading-relaxed whitespace-pre-wrap">
        {content}
        {isStreaming && (
          <span className="inline-block w-1.5 h-4 bg-primary animate-pulse rounded-sm ml-0.5 align-text-bottom" />
        )}
      </div>
    </div>
  );
}
