"use client";

import { useState, useTransition } from "react";
import { saveCRMSettings } from "./actions";
import type { CRMConfig } from "@/lib/crm-sync";

const PROVIDERS = [
  { value: "hubspot", label: "HubSpot" },
  { value: "close", label: "Close" },
  { value: "clickup", label: "ClickUp" },
  { value: "zapier", label: "Zapier" },
  { value: "custom", label: "Custom Webhook" },
] as const;

export default function CRMSettings({
  initialConfig,
}: {
  initialConfig: CRMConfig;
}) {
  const [config, setConfig] = useState<CRMConfig>(initialConfig);
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");

  function update(patch: Partial<CRMConfig>) {
    setConfig((prev) => ({ ...prev, ...patch }));
    setStatus("idle");
  }

  function handleSave() {
    startTransition(async () => {
      const result = await saveCRMSettings(config);
      setStatus(result.error ? "error" : "saved");
    });
  }

  return (
    <div className="max-w-xl space-y-5">
      <fieldset className="rounded-xl border border-border bg-surface p-6 space-y-4">
        <legend className="text-sm font-semibold px-2">Webhook Configuration</legend>

        <div>
          <label className="block text-sm text-muted mb-1">Provider</label>
          <select
            value={config.provider}
            onChange={(e) => update({ provider: e.target.value as CRMConfig["provider"] })}
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
          >
            {PROVIDERS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-muted mb-1">Webhook URL</label>
          <input
            type="url"
            value={config.webhook_url}
            onChange={(e) => update({ webhook_url: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm font-mono"
            placeholder="https://hooks.zapier.com/..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-muted mb-1">
              Auth Header (optional)
            </label>
            <input
              type="text"
              value={config.secret_header ?? ""}
              onChange={(e) => update({ secret_header: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
              placeholder="X-API-Key"
            />
          </div>
          <div>
            <label className="block text-sm text-muted mb-1">
              Auth Value (optional)
            </label>
            <input
              type="password"
              value={config.secret_value ?? ""}
              onChange={(e) => update({ secret_value: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
              placeholder="secret"
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={config.is_active}
            onChange={(e) => update({ is_active: e.target.checked })}
            className="rounded"
          />
          Active — sync new leads to CRM
        </label>
      </fieldset>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="px-6 py-2.5 rounded-lg bg-primary text-background font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isPending ? "Saving..." : "Save CRM Settings"}
        </button>
        {status === "saved" && (
          <span className="text-sm text-green-400">Settings saved</span>
        )}
        {status === "error" && (
          <span className="text-sm text-red-400">Failed to save</span>
        )}
      </div>
    </div>
  );
}
