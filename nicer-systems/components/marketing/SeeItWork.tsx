"use client";

import { useState } from "react";
import { ScrollReveal } from "./ScrollReveal";
import { AgentDemoForm } from "./AgentDemoForm";
import { AgentDemoResults } from "./AgentDemoResults";
import { track, EVENTS } from "@/lib/analytics";
import type { PreviewPlan } from "@/types/preview-plan";
import type { AgentRunInput } from "@/lib/validation";

const STEP_LABELS = [
  "Analyzing bottleneck...",
  "Mapping workflow stages...",
  "Designing automations...",
  "Building dashboard KPIs...",
  "Writing ops pulse...",
];

type DemoState =
  | { phase: "input" }
  | { phase: "running"; currentStep: number; error?: string }
  | { phase: "done"; plan: PreviewPlan; leadId: string };

export function SeeItWork() {
  const [state, setState] = useState<DemoState>({ phase: "input" });

  async function handleSubmit(input: AgentRunInput) {
    setState({ phase: "running", currentStep: 0 });
    track(EVENTS.AGENT_DEMO_START);

    try {
      // Simulate step progress while the API runs
      const stepInterval = setInterval(() => {
        setState((prev) => {
          if (prev.phase !== "running") return prev;
          if (prev.currentStep < STEP_LABELS.length - 1) {
            return { ...prev, currentStep: prev.currentStep + 1 };
          }
          return prev;
        });
      }, 3000);

      const res = await fetch("/api/agent/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      clearInterval(stepInterval);

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const message =
          body?.failed_step
            ? `${body?.error || "Agent chain failed"} (failed at: ${body.failed_step})`
            : body?.error || "Agent chain failed";
        throw new Error(message);
      }

      const data = await res.json();
      setState({
        phase: "done",
        plan: data.preview_plan,
        leadId: data.lead_id,
      });
      track(EVENTS.AGENT_DEMO_COMPLETE);
    } catch (err) {
      setState({
        phase: "running",
        currentStep: 0,
        error: err instanceof Error ? err.message : "Something went wrong",
      });
    }
  }

  function handleReset() {
    setState({ phase: "input" });
  }

  return (
    <section className="py-24">
      <div className="max-w-4xl mx-auto px-6">
        <ScrollReveal>
          <h2 className="text-3xl font-bold text-center mb-4">See It Work</h2>
          <p className="text-muted text-center mb-12">
            Describe your bottleneck and see what we&apos;d build.
          </p>
        </ScrollReveal>

        <ScrollReveal delay={0.2}>
          <div className="relative rounded-xl border border-border bg-surface overflow-hidden">
            {/* Terminal header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-surface-light">
              <div className="w-3 h-3 rounded-full bg-red-500/60" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
              <div className="w-3 h-3 rounded-full bg-green-500/60" />
              <span className="ml-2 text-xs text-muted font-mono">
                nicer-agent
              </span>
            </div>

            {/* Terminal body */}
            <div className="p-6">
              {state.phase === "input" && (
                <AgentDemoForm
                  onSubmit={handleSubmit}
                  disabled={false}
                />
              )}

              {state.phase === "running" && (
                <div className="font-mono text-sm space-y-3">
                  {STEP_LABELS.map((label, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-3 transition-opacity ${
                        i <= state.currentStep
                          ? "opacity-100"
                          : "opacity-20"
                      }`}
                    >
                      {i < state.currentStep ? (
                        <span className="text-green-400 w-5 text-center">
                          ✓
                        </span>
                      ) : i === state.currentStep ? (
                        <span className="w-5 text-center">
                          <span className="inline-block w-2 h-4 bg-primary animate-pulse rounded-sm" />
                        </span>
                      ) : (
                        <span className="text-muted w-5 text-center">○</span>
                      )}
                      <span
                        className={
                          i < state.currentStep
                            ? "text-green-400"
                            : i === state.currentStep
                              ? "text-primary"
                              : "text-muted"
                        }
                      >
                        {label}
                      </span>
                    </div>
                  ))}

                  {state.error && (
                    <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-sans">
                      {state.error}
                      <button
                        onClick={handleReset}
                        className="block mt-2 text-xs text-muted hover:text-foreground"
                      >
                        Try again
                      </button>
                    </div>
                  )}
                </div>
              )}

              {state.phase === "done" && (
                <AgentDemoResults
                  plan={state.plan}
                  leadId={state.leadId}
                  onReset={handleReset}
                />
              )}
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
