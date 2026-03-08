export const DEFAULT_THEME = {
  primary: "#00d4ff",
  secondary: "#7c3aed",
  gradientPreset: "dark-navy",
  glowIntensity: 60,
  motionIntensity: 2,
  brushStyle: "soft" as "soft" | "hard" | "spray",
} as const;

export const GRADIENT_PRESET_BACKGROUNDS: Record<string, string> = {
  "dark-navy":
    "linear-gradient(135deg, #0a0e1a 0%, #1a1e3a 50%, #0a0e1a 100%)",
  "midnight-purple":
    "linear-gradient(135deg, #0f0a1a 0%, #2d1b4e 50%, #0f0a1a 100%)",
  "deep-ocean":
    "linear-gradient(135deg, #0a1a1a 0%, #0d2b3e 50%, #0a1a1a 100%)",
  charcoal:
    "linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 50%, #1a1a1a 100%)",
  obsidian:
    "linear-gradient(135deg, #050505 0%, #1a1a1a 50%, #050505 100%)",
};

const BRUSH_STYLE_VARS: Record<string, { opacity: string; blur: string }> = {
  soft: { opacity: "0.82", blur: "0px" },
  hard: { opacity: "1", blur: "0px" },
  spray: { opacity: "0.68", blur: "6px" },
};

export type ThemeSettings = {
  theme_primary: string;
  theme_secondary: string;
  gradient_preset: string;
  glow_intensity: number;
  motion_intensity: number;
  brush_style: string;
};

export function themeToCSSVariables(theme: ThemeSettings) {
  const motionIntensity = Math.min(Math.max(theme.motion_intensity, 0), 3);
  const glowIntensity = Math.min(Math.max(theme.glow_intensity, 0), 100);
  const brushVars = BRUSH_STYLE_VARS[theme.brush_style] ?? BRUSH_STYLE_VARS.soft;

  return {
    "--theme-primary": theme.theme_primary,
    "--theme-secondary": theme.theme_secondary,
    "--theme-glow-intensity": `${theme.glow_intensity}%`,
    "--theme-motion-intensity": String(theme.motion_intensity),
    "--theme-glow-radius": `${16 + glowIntensity * 0.4}px`,
    "--theme-page-background":
      GRADIENT_PRESET_BACKGROUNDS[theme.gradient_preset] ??
      GRADIENT_PRESET_BACKGROUNDS[DEFAULT_THEME.gradientPreset],
    "--theme-brush-overlay-opacity": brushVars.opacity,
    "--theme-brush-overlay-blur": brushVars.blur,
    "--breathe-duration": `${12 - motionIntensity * 2}s`,
    "--morph-duration": `${18 - motionIntensity * 3}s`,
  } as Record<string, string>;
}
