"use client";

import { useState, useTransition, useCallback } from "react";
import type { ThemeSettings } from "@/lib/theme";
import {
  GRADIENT_PRESET_BACKGROUNDS,
  themeToCSSVariables,
} from "@/lib/theme";
import { saveThemeSettings } from "./actions";

const GRADIENT_PRESETS = [
  { value: "dark-navy", label: "Dark Navy" },
  { value: "midnight-purple", label: "Midnight Purple" },
  { value: "deep-ocean", label: "Deep Ocean" },
  { value: "charcoal", label: "Charcoal" },
  { value: "obsidian", label: "Obsidian" },
];

const BRUSH_STYLES = [
  { value: "soft", label: "Soft" },
  { value: "hard", label: "Hard" },
  { value: "spray", label: "Spray" },
];

const MOTION_LABELS = ["None", "Subtle", "Normal", "Full"];

export default function ThemeCustomizer({
  initialSettings,
}: {
  initialSettings: ThemeSettings;
}) {
  const [settings, setSettings] = useState<ThemeSettings>(initialSettings);
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");

  const update = useCallback(
    (patch: Partial<ThemeSettings>) => {
      setSettings((prev) => ({ ...prev, ...patch }));
      setStatus("idle");
    },
    []
  );

  const handleSave = () => {
    startTransition(async () => {
      const result = await saveThemeSettings(settings);
      if (result.error) {
        setStatus("error");
      } else {
        setStatus("saved");
      }
    });
  };

  const cssVars = themeToCSSVariables(settings);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Controls */}
      <div className="space-y-6">
        {/* Colors */}
        <fieldset className="rounded-xl border border-border bg-surface p-6 space-y-5">
          <legend className="text-sm font-semibold px-2">Colors</legend>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label htmlFor="theme_primary" className="block text-sm mb-2">
                Primary Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  id="theme_primary"
                  type="color"
                  value={settings.theme_primary}
                  onChange={(e) =>
                    update({ theme_primary: e.target.value })
                  }
                  className="w-10 h-10 rounded-lg border border-border cursor-pointer bg-transparent"
                />
                <span className="text-sm text-muted font-mono">
                  {settings.theme_primary}
                </span>
              </div>
            </div>

            <div>
              <label htmlFor="theme_secondary" className="block text-sm mb-2">
                Secondary Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  id="theme_secondary"
                  type="color"
                  value={settings.theme_secondary}
                  onChange={(e) =>
                    update({ theme_secondary: e.target.value })
                  }
                  className="w-10 h-10 rounded-lg border border-border cursor-pointer bg-transparent"
                />
                <span className="text-sm text-muted font-mono">
                  {settings.theme_secondary}
                </span>
              </div>
            </div>
          </div>
        </fieldset>

        {/* Gradient Preset */}
        <fieldset className="rounded-xl border border-border bg-surface p-6 space-y-3">
          <legend className="text-sm font-semibold px-2">
            Gradient Preset
          </legend>
          <select
            value={settings.gradient_preset}
            onChange={(e) => update({ gradient_preset: e.target.value })}
            className="w-full bg-surface-light border border-border rounded-lg px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            {GRADIENT_PRESETS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </fieldset>

        {/* Glow Intensity */}
        <fieldset className="rounded-xl border border-border bg-surface p-6 space-y-3">
          <legend className="text-sm font-semibold px-2">
            Glow Intensity
          </legend>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min={0}
              max={100}
              value={settings.glow_intensity}
              onChange={(e) =>
                update({ glow_intensity: Number(e.target.value) })
              }
              className="flex-1 accent-[var(--theme-primary)]"
            />
            <span className="text-sm text-muted font-mono w-12 text-right">
              {settings.glow_intensity}%
            </span>
          </div>
        </fieldset>

        {/* Motion Intensity */}
        <fieldset className="rounded-xl border border-border bg-surface p-6 space-y-3">
          <legend className="text-sm font-semibold px-2">
            Motion Intensity
          </legend>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min={0}
              max={3}
              step={1}
              value={settings.motion_intensity}
              onChange={(e) =>
                update({ motion_intensity: Number(e.target.value) })
              }
              className="flex-1 accent-[var(--theme-primary)]"
            />
            <span className="text-sm text-muted font-mono w-16 text-right">
              {MOTION_LABELS[settings.motion_intensity]}
            </span>
          </div>
        </fieldset>

        {/* Brush Style */}
        <fieldset className="rounded-xl border border-border bg-surface p-6 space-y-3">
          <legend className="text-sm font-semibold px-2">Brush Style</legend>
          <div className="flex gap-3">
            {BRUSH_STYLES.map((style) => (
              <button
                key={style.value}
                type="button"
                onClick={() => update({ brush_style: style.value })}
                className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                  settings.brush_style === style.value
                    ? "bg-primary/20 border-primary text-foreground"
                    : "bg-surface-light border-border text-muted hover:text-foreground"
                }`}
              >
                {style.label}
              </button>
            ))}
          </div>
        </fieldset>

        {/* Save */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="px-6 py-2.5 rounded-lg bg-primary text-background font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isPending ? "Saving…" : "Save Settings"}
          </button>
          {status === "saved" && (
            <span className="text-sm text-green-400">Settings saved</span>
          )}
          {status === "error" && (
            <span className="text-sm text-red-400">
              Failed to save — check console
            </span>
          )}
        </div>
      </div>

      {/* Live Preview */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-muted">Live Preview</h2>
        <div
          className="rounded-xl border border-border overflow-hidden"
          style={{
            ...cssVars,
            background:
              GRADIENT_PRESET_BACKGROUNDS[settings.gradient_preset] ??
              GRADIENT_PRESET_BACKGROUNDS["dark-navy"],
          }}
        >
          {/* Mini hero preview */}
          <div className="p-8 space-y-6">
            <div className="space-y-3">
              <h3
                className="text-2xl font-bold"
                style={{ color: settings.theme_primary }}
              >
                Nicer Systems
              </h3>
              <p className="text-sm" style={{ color: "#e8eaf0" }}>
                Tell us the problem. We&apos;ll build the system.
              </p>
            </div>

            {/* CTA buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                className="px-4 py-2 rounded-lg text-sm font-medium text-background"
                style={{
                  backgroundColor: settings.theme_primary,
                  boxShadow:
                    settings.glow_intensity > 0
                      ? `0 0 ${settings.glow_intensity * 0.3}px ${settings.theme_primary}${Math.round(settings.glow_intensity * 0.6).toString(16).padStart(2, "0")}`
                      : "none",
                }}
              >
                Book a scoping call
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-lg text-sm font-medium border"
                style={{
                  borderColor: settings.theme_secondary,
                  color: settings.theme_secondary,
                }}
              >
                Get a Preview Plan
              </button>
            </div>

            {/* Color swatch bar */}
            <div className="flex gap-2 pt-4 border-t border-white/10">
              <div
                className="w-8 h-8 rounded-md"
                style={{ backgroundColor: settings.theme_primary }}
                title="Primary"
              />
              <div
                className="w-8 h-8 rounded-md"
                style={{ backgroundColor: settings.theme_secondary }}
                title="Secondary"
              />
              <div
                className="w-8 h-8 rounded-md"
                style={{
                  background: `linear-gradient(135deg, ${settings.theme_primary}, ${settings.theme_secondary})`,
                }}
                title="Gradient"
              />
            </div>

            {/* Glow demo */}
            <div className="pt-4 border-t border-white/10">
              <p className="text-xs text-white/50 mb-2">
                Glow: {settings.glow_intensity}% · Motion:{" "}
                {MOTION_LABELS[settings.motion_intensity]} · Brush:{" "}
                {settings.brush_style}
              </p>
              <div
                className="h-1 rounded-full"
                style={{
                  background: `linear-gradient(90deg, ${settings.theme_primary}, ${settings.theme_secondary})`,
                  boxShadow:
                    settings.glow_intensity > 0
                      ? `0 0 ${settings.glow_intensity * 0.4}px ${settings.theme_primary}80`
                      : "none",
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
