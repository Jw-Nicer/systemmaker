"use client";

import { useState } from "react";
import type { PreviewPlan } from "@/types/preview-plan";
import { track, EVENTS } from "@/lib/analytics";
import { PlanDisplay } from "./PlanDisplay";

interface Props {
  plan: PreviewPlan;
  leadId: string;
  onReset: () => void;
  planId?: string;
  showShare?: boolean;
}

export function AgentDemoResults({
  plan,
  leadId,
  onReset,
  planId,
  showShare = false,
}: Props) {
  const [emailForm, setEmailForm] = useState({ name: "", email: "" });
  const [emailStatus, setEmailStatus] = useState<
    "idle" | "sending" | "sent" | "error"
  >("idle");

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
        plan_id: planId,
        source: "agent_demo",
      });
      track(EVENTS.CTA_CLICK_PREVIEW_PLAN);
    } catch {
      setEmailStatus("error");
    }
  }

  return (
    <div className="space-y-4 font-sans">
      <PlanDisplay
        plan={plan}
        planId={planId}
        showShare={showShare}
      />

      <div className="rounded-xl border border-primary/30 bg-surface p-6">
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

      <div className="text-center pt-1">
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
