export const DEFAULT_THEME = {
  primary: "#00d4ff",
  secondary: "#7c3aed",
  gradientPreset: "cream-natural",
  glowIntensity: 60,
  motionIntensity: 2,
  brushStyle: "soft" as "soft" | "hard" | "spray",
} as const;

export const GRADIENT_PRESET_BACKGROUNDS: Record<string, string> = {
  "cream-natural":
    "linear-gradient(135deg, #f4efe5 0%, #f8f4ea 50%, #f4efe5 100%)",
  "sage-mist":
    "linear-gradient(135deg, #eef3eb 0%, #e4ede0 50%, #eef3eb 100%)",
  "warm-sand":
    "linear-gradient(135deg, #f5ede0 0%, #f0e5d3 50%, #f5ede0 100%)",
  "ivory-blush":
    "linear-gradient(135deg, #f5efe8 0%, #f2e8e3 50%, #f5efe8 100%)",
  "stone-moss":
    "linear-gradient(135deg, #e8e5de 0%, #dddad0 50%, #e8e5de 100%)",
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
