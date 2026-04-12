"use client";

import { useEffect, useState } from "react";
import {
  getCRMConfigAction,
  updateCRMConfigAction,
  testWebhookAction,
} from "@/lib/actions/crm-config";
import type { CRMConfig } from "@/lib/firestore/crm-config";

const EVENT_OPTIONS = [
  { key: "lead_created", label: "Lead created" },
  { key: "lead_status_changed", label: "Lead status changed" },
  { key: "plan_generated", label: "Plan generated" },
];

export default function CRMSettings() {
  const [config, setConfig] = useState<Partial<CRMConfig>>({
    webhook_url: "",
    webhook_secret: "",
    enabled: false,
    events: [],
  });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    getCRMConfigAction()
      .then((c) => {
        if (c) setConfig(c);
      })
      .catch(() => {});
  }, []);

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      await updateCRMConfigAction(config);
      setMessage({ type: "success", text: "CRM settings saved" });
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to save",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    setMessage(null);
    try {
      const result = await testWebhookAction();
      if (result.success) {
        setMessage({ type: "success", text: "Test webhook sent successfully" });
      } else {
        setMessage({
          type: "error",
          text: result.error ?? "Test failed",
        });
      }
    } catch {
      setMessage({ type: "error", text: "Test request failed" });
    } finally {
      setTesting(false);
    }
  }

  function toggleEvent(key: string) {
    setConfig((prev) => {
      const events = prev.events ?? [];
      const next = events.includes(key)
        ? events.filter((e) => e !== key)
        : [...events, key];
      return { ...prev, events: next };
    });
  }

  return (
    <div className="mt-10 space-y-6">
      <div>
        <h3 className="text-base font-semibold text-[#1d2318]">CRM Webhook</h3>
        <p className="mt-1 text-sm text-[#6c7467]">
          Send lead and plan events to an external CRM or webhook endpoint.
        </p>
      </div>

      <div className="space-y-4 rounded-[20px] border border-[#d7d0c1] bg-[linear-gradient(180deg,#faf7ef,#f0e8db)] p-6">
        {/* Enabled toggle */}
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={config.enabled ?? false}
            onChange={(e) =>
              setConfig((prev) => ({ ...prev, enabled: e.target.checked }))
            }
            className="h-4 w-4 rounded border-[#d0c8b8] text-primary focus:ring-primary"
          />
          <span className="text-sm font-medium text-[#1d2318]">
            Enable webhook
          </span>
        </label>

        {/* Webhook URL */}
        <div>
          <label className="block text-xs font-medium text-[#6c7467] mb-1">
            Webhook URL
          </label>
          <input
            type="url"
            value={config.webhook_url ?? ""}
            onChange={(e) =>
              setConfig((prev) => ({ ...prev, webhook_url: e.target.value }))
            }
            placeholder="https://hooks.example.com/nicer-systems"
            className="w-full rounded-lg border border-[#d0c8b8] bg-white px-3 py-2 text-sm text-[#1d2318] focus:border-primary focus:outline-none"
          />
        </div>

        {/* Webhook secret */}
        <div>
          <label className="block text-xs font-medium text-[#6c7467] mb-1">
            Webhook Secret (HMAC-SHA256 signing)
          </label>
          <input
            type="password"
            value={config.webhook_secret ?? ""}
            onChange={(e) =>
              setConfig((prev) => ({
                ...prev,
                webhook_secret: e.target.value,
              }))
            }
            placeholder="your-webhook-secret"
            className="w-full rounded-lg border border-[#d0c8b8] bg-white px-3 py-2 text-sm text-[#1d2318] focus:border-primary focus:outline-none"
          />
        </div>

        {/* Event types */}
        <div>
          <label className="block text-xs font-medium text-[#6c7467] mb-2">
            Events to send
          </label>
          <div className="flex flex-wrap gap-2">
            {EVENT_OPTIONS.map((opt) => (
              <label
                key={opt.key}
                className="flex items-center gap-2 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={config.events?.includes(opt.key) ?? false}
                  onChange={() => toggleEvent(opt.key)}
                  className="h-3.5 w-3.5 rounded border-[#d0c8b8] text-primary focus:ring-primary"
                />
                <span className="text-xs text-[#1d2318]">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-full bg-[#171d13] px-5 py-2 text-sm font-semibold text-[#f7f2e8] transition-transform hover:scale-[1.02] disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
          <button
            onClick={handleTest}
            disabled={testing || !config.enabled || !config.webhook_url}
            className="rounded-full border border-[#d0c8b8] bg-white px-5 py-2 text-sm font-medium text-[#27311f] transition-colors hover:bg-[#f7f2e8] disabled:opacity-50"
          >
            {testing ? "Testing..." : "Test Webhook"}
          </button>
        </div>

        {/* Message */}
        {message && (
          <p
            className={`text-xs mt-2 ${
              message.type === "success" ? "text-green-600" : "text-red-500"
            }`}
          >
            {message.text}
          </p>
        )}
      </div>
    </div>
  );
}
