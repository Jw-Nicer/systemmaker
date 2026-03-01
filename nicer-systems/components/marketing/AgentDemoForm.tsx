"use client";

import type { AgentRunInput } from "@/lib/validation";

const INDUSTRIES = [
  "Logistics",
  "Finance",
  "Healthcare",
  "Real Estate",
  "Legal",
  "Insurance",
  "Construction",
  "Retail",
  "Manufacturing",
  "Other",
];

interface Props {
  onSubmit: (input: AgentRunInput) => void;
  disabled: boolean;
}

export function AgentDemoForm({ onSubmit, disabled }: Props) {
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    onSubmit({
      industry: fd.get("industry") as string,
      bottleneck: fd.get("bottleneck") as string,
      current_tools: fd.get("current_tools") as string,
      urgency: (fd.get("urgency") as "low" | "medium" | "high" | "urgent") || undefined,
      volume: (fd.get("volume") as string) || undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-muted mb-1 font-sans">
            Industry *
          </label>
          <select
            name="industry"
            required
            disabled={disabled}
            className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:border-primary focus:outline-none"
          >
            <option value="">Select industry</option>
            {INDUSTRIES.map((ind) => (
              <option key={ind} value={ind}>
                {ind}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-muted mb-1 font-sans">
            Current Tools *
          </label>
          <input
            name="current_tools"
            type="text"
            required
            disabled={disabled}
            placeholder="e.g. Salesforce, Slack, Excel"
            className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:border-primary focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs text-muted mb-1 font-sans">
          What&apos;s your biggest operational bottleneck? *
        </label>
        <textarea
          name="bottleneck"
          required
          disabled={disabled}
          rows={3}
          placeholder="Describe the pain point — what takes too long, what breaks, what's manual..."
          className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:border-primary focus:outline-none resize-none"
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-muted mb-1 font-sans">
            Urgency
          </label>
          <select
            name="urgency"
            disabled={disabled}
            className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:border-primary focus:outline-none"
          >
            <option value="">Select urgency</option>
            <option value="low">Low — exploring options</option>
            <option value="medium">Medium — planning this quarter</option>
            <option value="high">High — need it soon</option>
            <option value="urgent">Urgent — this is blocking us</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-muted mb-1 font-sans">
            Volume (optional)
          </label>
          <input
            name="volume"
            type="text"
            disabled={disabled}
            placeholder="e.g. 200 orders/week"
            className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:border-primary focus:outline-none"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={disabled}
        className="w-full px-6 py-3 rounded-lg bg-primary text-background font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed font-sans"
      >
        {disabled ? "Generating..." : "Generate Preview Plan"}
      </button>
    </form>
  );
}
