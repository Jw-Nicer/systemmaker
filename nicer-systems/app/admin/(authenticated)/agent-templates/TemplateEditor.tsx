"use client";

import { useState } from "react";
import type { AgentTemplate } from "@/types/agent-template";
import {
  updateTemplate,
  testRunTemplate,
} from "@/lib/actions/agent-templates";

const SAMPLE_INPUTS: Record<string, Record<string, unknown>> = {
  intake_agent: {
    industry: "Logistics",
    bottleneck:
      "Dispatch tracking is manual — drivers call in updates, dispatchers enter into spreadsheets. 3-hour delays in status updates.",
    current_tools: "Google Sheets, WhatsApp, phone calls",
    urgency: "high",
    volume: "200 deliveries/day",
  },
  workflow_mapper: {
    clarified_problem:
      "Manual dispatch tracking causing significant delays in delivery status updates",
    industry: "Logistics",
    current_tools: "Google Sheets, WhatsApp",
    assumptions: ["Drivers have smartphones", "Internet connectivity available"],
    suggested_scope: "Delivery tracking and status update workflow",
  },
  automation_designer: {
    stages: [
      {
        name: "Order received",
        owner_role: "Dispatcher",
        entry_criteria: "New order placed",
        exit_criteria: "Driver assigned",
      },
    ],
    required_fields: ["order_id", "driver_id", "status", "timestamp"],
    current_tools: "Google Sheets, WhatsApp",
    failure_modes: ["Driver doesn't update status", "Delayed data entry"],
  },
  dashboard_designer: {
    stages: [
      {
        name: "Order received",
        owner_role: "Dispatcher",
        entry_criteria: "New order placed",
        exit_criteria: "Driver assigned",
      },
    ],
    timestamps: ["order_placed", "driver_assigned", "picked_up", "delivered"],
    industry: "Logistics",
    required_fields: ["order_id", "driver_id", "status"],
  },
  ops_pulse_writer: {
    kpis: [
      {
        name: "On-time delivery rate",
        definition: "% of deliveries completed within SLA",
        why_it_matters: "Core customer satisfaction metric",
      },
    ],
    dashboards: [
      {
        name: "Operations Overview",
        purpose: "Real-time delivery tracking",
        widgets: ["Active deliveries", "SLA at risk"],
      },
    ],
    failure_modes: ["Driver doesn't update status"],
  },
};

export default function TemplateEditor({
  initialData,
}: {
  initialData: AgentTemplate[];
}) {
  const [templates, setTemplates] = useState<AgentTemplate[]>(initialData);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [markdown, setMarkdown] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">(
    "idle"
  );
  const [testing, setTesting] = useState(false);
  const [testOutput, setTestOutput] = useState<string | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  const selected = templates.find((t) => t.id === selectedId);

  function selectTemplate(template: AgentTemplate) {
    setSelectedId(template.id);
    setMarkdown(template.markdown);
    setSaveStatus("idle");
    setTestOutput(null);
    setTestError(null);
  }

  async function handleSave() {
    if (!selectedId) return;
    setSaving(true);
    setSaveStatus("idle");

    const result = await updateTemplate(selectedId, markdown);
    setSaving(false);

    if (result.success) {
      setSaveStatus("saved");
      setTemplates((prev) =>
        prev.map((t) =>
          t.id === selectedId
            ? { ...t, markdown, updated_at: new Date().toISOString() }
            : t
        )
      );
    } else {
      setSaveStatus("error");
    }
  }

  async function handleTestRun() {
    if (!selected) return;
    setTesting(true);
    setTestOutput(null);
    setTestError(null);

    const sampleInput = SAMPLE_INPUTS[selected.key] ?? {
      industry: "Logistics",
      bottleneck: "Manual data entry causing delays",
      current_tools: "Spreadsheets",
    };

    const result = await testRunTemplate(selected.key, sampleInput);
    setTesting(false);

    if (result.success) {
      setTestOutput(JSON.stringify(result.output, null, 2));
    } else {
      setTestError(result.error ?? "Test run failed");
    }
  }

  function formatDate(iso: string) {
    try {
      return new Date(iso).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">Agent Templates</h1>
        <p className="text-muted text-sm">
          Edit agent prompts without redeploying. Changes take effect
          immediately.
        </p>
      </div>

      <div className="grid lg:grid-cols-[280px_1fr] gap-6">
        {/* Template list */}
        <div className="space-y-1">
          {templates.map((t) => (
            <button
              key={t.id}
              onClick={() => selectTemplate(t)}
              className={`w-full text-left px-4 py-3 rounded-lg text-sm transition-colors ${
                selectedId === t.id
                  ? "bg-primary/10 border border-primary/30 text-foreground"
                  : "hover:bg-surface-light border border-transparent text-muted"
              }`}
            >
              <p className="font-medium">{t.name}</p>
              <p className="text-xs text-muted mt-0.5">
                Updated {formatDate(t.updated_at)}
              </p>
            </button>
          ))}
        </div>

        {/* Editor */}
        {selected ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{selected.name}</h2>
              <span className="text-xs text-muted font-mono">
                {selected.key}
              </span>
            </div>

            <textarea
              value={markdown}
              onChange={(e) => {
                setMarkdown(e.target.value);
                setSaveStatus("idle");
              }}
              rows={20}
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground text-sm font-mono resize-y"
            />

            <div className="flex items-center gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-primary text-background text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Template"}
              </button>
              <button
                onClick={handleTestRun}
                disabled={testing}
                className="px-4 py-2 rounded-lg border border-border text-sm text-muted hover:text-foreground transition-colors disabled:opacity-50"
              >
                {testing ? "Running..." : "Test Run"}
              </button>
              {saveStatus === "saved" && (
                <span className="text-sm text-green-400">Saved</span>
              )}
              {saveStatus === "error" && (
                <span className="text-sm text-red-400">Failed to save</span>
              )}
            </div>

            {/* Test output */}
            {testOutput && (
              <div className="rounded-xl border border-border bg-surface-light overflow-hidden">
                <div className="px-4 py-2 border-b border-border text-xs text-muted font-medium">
                  Test Run Output
                </div>
                <pre className="p-4 text-xs font-mono overflow-x-auto max-h-96 text-foreground">
                  {testOutput}
                </pre>
              </div>
            )}
            {testError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {testError}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center py-24 text-muted text-sm">
            Select a template to edit
          </div>
        )}
      </div>
    </div>
  );
}
