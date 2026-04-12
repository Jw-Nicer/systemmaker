"use client";

import type { PlanSectionType } from "@/types/chat";
import type {
  IntakeOutput,
  WorkflowMapperOutput,
  AutomationDesignerOutput,
  DashboardDesignerOutput,
  OpsPulseOutput,
  ImplementationSequencerOutput,
  ProposalOutput,
} from "@/types/preview-plan";

interface ChatPlanCardProps {
  title: string;
  /** JSON-stringified section payload from the SSE stream. */
  content: string;
  /** Pipeline section key — drives renderer + icon. */
  sectionType?: PlanSectionType;
  /** True when section is still streaming in. */
  isStreaming?: boolean;
  /** Section index for visual ordering. */
  index?: number;
  /** Callback for retry/refine on failed sections (2C). */
  onRetry?: (sectionType: PlanSectionType) => void;
}

const SECTION_ICONS: Record<PlanSectionType, string> = {
  intake: "📋",
  workflow: "🔀",
  automation: "⚡",
  dashboard: "📊",
  ops_pulse: "📡",
  implementation_sequencer: "🗓️",
  proposal_writer: "📝",
};

function safeParse<T = unknown>(json: string): T | null {
  if (!json) return null;
  try {
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

/**
 * Detect if a parsed section is a fallback (all arrays empty, key strings blank).
 * These are produced by FALLBACK_OUTPUTS in context.ts when a stage fails.
 */
export function isFallbackSection(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  const values = Object.values(data as Record<string, unknown>);
  if (values.length === 0) return true;
  return values.every((v) => {
    if (Array.isArray(v)) return v.length === 0;
    if (typeof v === "string") return v.trim().length === 0;
    if (v && typeof v === "object") return isFallbackSection(v);
    return false;
  });
}

export function ChatPlanCard({
  title,
  content,
  sectionType,
  isStreaming = false,
  index,
  onRetry,
}: ChatPlanCardProps) {
  const icon = (sectionType && SECTION_ICONS[sectionType]) ?? "📄";
  const data = sectionType ? safeParse(content) : null;
  const isFallback = data ? isFallbackSection(data) : false;

  return (
    <div className="rounded-lg border border-primary/20 bg-surface overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-surface-light/50">
        <span className="text-sm" aria-hidden>
          {icon}
        </span>
        {typeof index === "number" && (
          <span className="text-xs text-muted font-mono">{index + 1}/5</span>
        )}
        <span className="text-sm font-medium flex-1">{title}</span>
        {isStreaming && (
          <span className="text-xs text-primary animate-pulse">
            generating...
          </span>
        )}
      </div>
      <div className="px-4 py-3 text-sm leading-relaxed">
        {data && sectionType && !isFallback ? (
          <SectionBody type={sectionType} data={data} />
        ) : isStreaming ? (
          <span className="text-xs text-muted">Building this section…</span>
        ) : isFallback && sectionType && onRetry ? (
          <div className="space-y-2">
            <p className="text-xs text-muted">
              This section could not be generated and contains placeholder data.
            </p>
            <button
              onClick={() => onRetry(sectionType)}
              className="text-xs px-3 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary font-medium hover:bg-primary/20 transition-colors"
            >
              Retry this section
            </button>
          </div>
        ) : (
          <p className="text-xs text-muted whitespace-pre-wrap break-words">
            {content || "(empty)"}
          </p>
        )}
        {isStreaming && (
          <span className="inline-block w-1.5 h-4 bg-primary animate-pulse rounded-sm ml-0.5 align-text-bottom" />
        )}
      </div>
    </div>
  );
}

// ─── Per-section renderers ─────────────────────────────────────────────────

function SectionBody({
  type,
  data,
}: {
  type: PlanSectionType;
  data: unknown;
}) {
  switch (type) {
    case "intake":
      return <IntakeBody data={data as IntakeOutput} />;
    case "workflow":
      return <WorkflowBody data={data as WorkflowMapperOutput} />;
    case "automation":
      return <AutomationBody data={data as AutomationDesignerOutput} />;
    case "dashboard":
      return <DashboardBody data={data as DashboardDesignerOutput} />;
    case "ops_pulse":
      return <OpsPulseBody data={data as OpsPulseOutput} />;
    case "implementation_sequencer":
      return <RoadmapBody data={data as ImplementationSequencerOutput} />;
    case "proposal_writer":
      return <ProposalBody data={data as ProposalOutput} />;
    default:
      return null;
  }
}

function SubLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] uppercase tracking-wide text-muted mb-1">
      {children}
    </p>
  );
}

function IntakeBody({ data }: { data: IntakeOutput }) {
  return (
    <div className="space-y-2">
      {data.suggested_scope && (
        <p className="font-medium text-foreground">{data.suggested_scope}</p>
      )}
      {data.clarified_problem && (
        <p className="text-xs text-muted">{data.clarified_problem}</p>
      )}
      {data.assumptions?.length > 0 && (
        <div>
          <SubLabel>Assumptions</SubLabel>
          <ul className="text-xs text-muted list-disc pl-4 space-y-0.5">
            {data.assumptions.slice(0, 3).map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function WorkflowBody({ data }: { data: WorkflowMapperOutput }) {
  const stages = data.stages ?? [];
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted">
        {stages.length} stage{stages.length === 1 ? "" : "s"}
      </p>
      {stages.length > 0 && (
        <ol className="text-xs space-y-1 list-decimal pl-4">
          {stages.map((s, i) => (
            <li key={i}>
              <span className="font-medium text-foreground">{s.name}</span>
              {s.owner_role && (
                <span className="text-muted"> — {s.owner_role}</span>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function AutomationBody({ data }: { data: AutomationDesignerOutput }) {
  const automations = data.automations ?? [];
  const alerts = data.alerts ?? [];
  return (
    <div className="space-y-2">
      {automations.length > 0 && (
        <div>
          <SubLabel>Automations</SubLabel>
          <ul className="text-xs space-y-1.5">
            {automations.map((a, i) => (
              <li key={i}>
                <span className="font-medium text-foreground">{a.trigger}</span>
                {a.steps?.length > 0 && (
                  <span className="text-muted">
                    {" "}→ {a.steps[0]}
                    {a.steps.length > 1 ? ` (+${a.steps.length - 1} more)` : ""}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      {alerts.length > 0 && (
        <p className="text-xs text-muted">
          {alerts.length} alert{alerts.length === 1 ? "" : "s"} configured
        </p>
      )}
    </div>
  );
}

function DashboardBody({ data }: { data: DashboardDesignerOutput }) {
  const kpis = data.kpis ?? [];
  return (
    <div className="space-y-2">
      {kpis.length > 0 && (
        <div>
          <SubLabel>KPIs</SubLabel>
          <ul className="text-xs space-y-1">
            {kpis.map((k, i) => (
              <li key={i}>
                <span className="font-medium text-foreground">{k.name}</span>
                {k.definition && (
                  <span className="text-muted"> — {k.definition}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function OpsPulseBody({ data }: { data: OpsPulseOutput }) {
  const actions = data.actions ?? [];
  const summary = data.executive_summary;
  return (
    <div className="space-y-2">
      {summary?.solution && (
        <p className="text-foreground text-xs">
          <span className="font-medium">Solution:</span> {summary.solution}
        </p>
      )}
      {summary?.impact && (
        <p className="text-xs text-muted">
          <span className="font-medium">Impact:</span> {summary.impact}
        </p>
      )}
      {actions.length > 0 && (
        <div>
          <SubLabel>Top actions</SubLabel>
          <ul className="text-xs text-muted space-y-0.5">
            {actions.slice(0, 3).map((a, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <span
                  className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded font-medium ${
                    a.priority === "high"
                      ? "bg-red-500/10 text-red-400"
                      : a.priority === "medium"
                        ? "bg-yellow-500/10 text-yellow-400"
                        : "bg-green-500/10 text-green-400"
                  }`}
                >
                  {a.priority}
                </span>
                <span>{a.action}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function RoadmapBody({ data }: { data: ImplementationSequencerOutput }) {
  const phases = data.phases ?? [];
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted">
        {data.total_estimated_weeks ?? phases.length} weeks · {phases.length}{" "}
        phase{phases.length === 1 ? "" : "s"}
      </p>
      {phases.length > 0 && (
        <ul className="text-xs space-y-1">
          {phases.map((p, i) => (
            <li key={i}>
              <span className="font-medium text-foreground">Week {p.week}</span>
              {p.title && <span className="text-muted"> — {p.title}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ProposalBody({ data }: { data: ProposalOutput }) {
  const vps = data.value_propositions ?? [];
  return (
    <div className="space-y-2">
      {data.executive_pitch && (
        <p className="text-xs text-foreground line-clamp-3">{data.executive_pitch}</p>
      )}
      {vps.length > 0 && (
        <div>
          <SubLabel>Value propositions</SubLabel>
          <ul className="text-xs text-muted space-y-0.5">
            {vps.slice(0, 3).map((vp, i) => (
              <li key={i}>
                <span className="font-medium text-foreground">{vp.claim}</span>
                {vp.metric && <span className="text-muted"> — {vp.metric}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
      {data.estimated_roi && (
        <p className="text-xs text-muted">
          <span className="font-medium">Est. ROI:</span> {data.estimated_roi.slice(0, 120)}
          {data.estimated_roi.length > 120 ? "..." : ""}
        </p>
      )}
    </div>
  );
}
