"use client";

import { useState } from "react";
import type { PreviewPlan } from "@/types/preview-plan";
import { track, EVENTS } from "@/lib/analytics";

interface Props {
  plan: PreviewPlan;
  leadId: string;
  onReset: () => void;
}

export function AgentDemoResults({ plan, leadId, onReset }: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    scope: true,
    workflow: true,
    kpis: false,
    alerts: false,
    actions: false,
  });
  const [emailForm, setEmailForm] = useState({ name: "", email: "" });
  const [emailStatus, setEmailStatus] = useState<
    "idle" | "sending" | "sent" | "error"
  >("idle");

  function toggle(key: string) {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEmailStatus("sending");

    try {
      const res = await fetch("/api/agent/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: emailForm.name,
          email: emailForm.email,
          preview_plan: plan,
          lead_id: leadId,
        }),
      });

      if (!res.ok) throw new Error("Failed");
      setEmailStatus("sent");
      track(EVENTS.PREVIEW_PLAN_EMAIL_CAPTURE, {
        lead_id: leadId,
        source: "agent_demo",
      });
      track(EVENTS.CTA_CLICK_PREVIEW_PLAN);
    } catch {
      setEmailStatus("error");
    }
  }

  return (
    <div className="space-y-3 font-sans">
      {/* Scope */}
      <Section
        title="Suggested Scope"
        expanded={expanded.scope}
        onToggle={() => toggle("scope")}
      >
        <p className="font-medium text-primary mb-2">
          {plan.intake.suggested_scope}
        </p>
        <p className="text-sm text-muted">{plan.intake.clarified_problem}</p>
        {plan.intake.assumptions.length > 0 && (
          <div className="mt-3">
            <p className="text-xs text-muted uppercase mb-1">Assumptions</p>
            <ul className="text-sm text-muted list-disc pl-4 space-y-0.5">
              {plan.intake.assumptions.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          </div>
        )}
      </Section>

      {/* Workflow */}
      <Section
        title={`Workflow Map (${plan.workflow.stages.length} stages)`}
        expanded={expanded.workflow}
        onToggle={() => toggle("workflow")}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted border-b border-border">
                <th className="pb-2 pr-4">#</th>
                <th className="pb-2 pr-4">Stage</th>
                <th className="pb-2 pr-4">Owner</th>
                <th className="pb-2">Exit Criteria</th>
              </tr>
            </thead>
            <tbody>
              {plan.workflow.stages.map((s, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td className="py-2 pr-4 text-muted">{i + 1}</td>
                  <td className="py-2 pr-4 font-medium">{s.name}</td>
                  <td className="py-2 pr-4 text-muted">{s.owner_role}</td>
                  <td className="py-2 text-muted text-xs">
                    {s.exit_criteria}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* KPIs */}
      <Section
        title={`Dashboard KPIs (${plan.dashboard.kpis.length})`}
        expanded={expanded.kpis}
        onToggle={() => toggle("kpis")}
      >
        <div className="grid sm:grid-cols-2 gap-3">
          {plan.dashboard.kpis.map((k, i) => (
            <div
              key={i}
              className="rounded-lg border border-border bg-background p-4"
            >
              <p className="font-medium text-sm">{k.name}</p>
              <p className="text-xs text-muted mt-1">{k.definition}</p>
              <p className="text-xs text-muted/60 mt-1 italic">
                {k.why_it_matters}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* Alerts */}
      <Section
        title={`Automated Alerts (${plan.automation.alerts.length})`}
        expanded={expanded.alerts}
        onToggle={() => toggle("alerts")}
      >
        <ul className="space-y-2">
          {plan.automation.alerts.map((a, i) => (
            <li
              key={i}
              className="text-sm rounded-lg border border-border bg-background p-3"
            >
              <span className="font-medium">{a.when}</span>
              <span className="text-muted"> → notify </span>
              <span className="text-primary">{a.who}</span>
              <p className="text-xs text-muted mt-1">&ldquo;{a.message}&rdquo;</p>
            </li>
          ))}
        </ul>
      </Section>

      {/* Actions */}
      <Section
        title="Recommended Actions"
        expanded={expanded.actions}
        onToggle={() => toggle("actions")}
      >
        <div className="space-y-2">
          {plan.ops_pulse.actions.map((a, i) => (
            <div
              key={i}
              className="flex items-start gap-3 text-sm"
            >
              <span
                className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${
                  a.priority === "high"
                    ? "bg-red-500/10 text-red-400"
                    : a.priority === "medium"
                      ? "bg-yellow-500/10 text-yellow-400"
                      : "bg-green-500/10 text-green-400"
                }`}
              >
                {a.priority}
              </span>
              <div>
                <span className="text-muted">{a.owner_role}:</span>{" "}
                {a.action}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Disclaimer */}
      <p className="text-xs text-muted/60 italic text-center pt-2">
        This is a draft preview — not a final recommendation. Assumptions may
        not match your exact setup.
      </p>

      {/* Email CTA */}
      <div className="rounded-xl border border-primary/30 bg-surface p-6 mt-4">
        {emailStatus === "sent" ? (
          <div className="text-center">
            <p className="text-primary font-medium">Plan sent to your inbox!</p>
            <p className="text-sm text-muted mt-1">
              Check your email for the full preview plan.
            </p>
          </div>
        ) : (
          <>
            <p className="font-medium text-center mb-4">
              Email this plan to yourself
            </p>
            <form
              onSubmit={handleEmailSubmit}
              className="flex flex-col sm:flex-row gap-3"
            >
              <input
                type="text"
                value={emailForm.name}
                onChange={(e) =>
                  setEmailForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="Your name"
                required
                className="flex-1 px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:border-primary focus:outline-none"
              />
              <input
                type="email"
                value={emailForm.email}
                onChange={(e) =>
                  setEmailForm((f) => ({ ...f, email: e.target.value }))
                }
                placeholder="you@company.com"
                required
                className="flex-1 px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:border-primary focus:outline-none"
              />
              <button
                type="submit"
                disabled={emailStatus === "sending"}
                className="px-6 py-2 rounded-lg bg-primary text-background text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {emailStatus === "sending" ? "Sending..." : "Send"}
              </button>
            </form>
            {emailStatus === "error" && (
              <p className="text-red-400 text-xs mt-2 text-center">
                Failed to send — please try again.
              </p>
            )}
          </>
        )}
      </div>

      {/* Start over */}
      <div className="text-center pt-2">
        <button
          onClick={onReset}
          className="text-sm text-muted hover:text-foreground transition-colors"
        >
          Start over with a new bottleneck
        </button>
      </div>
    </div>
  );
}

function Section({
  title,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-surface-light/50 transition-colors"
      >
        <span className="text-sm font-medium">{title}</span>
        <span className="text-muted text-xs">{expanded ? "−" : "+"}</span>
      </button>
      {expanded && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}
