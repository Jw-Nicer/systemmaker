export const DEFAULT_THEME = {
  primary: "#00d4ff",
  secondary: "#7c3aed",
  gradientPreset: "dark-navy",
  glowIntensity: 60,
  motionIntensity: 2,
  brushStyle: "soft" as "soft" | "hard" | "spray",
} as const;

export type ThemeSettings = {
  theme_primary: string;
  theme_secondary: string;
  gradient_preset: string;
  glow_intensity: number;
  motion_intensity: number;
  brush_style: string;
};

export function themeToCSSVariables(theme: ThemeSettings) {
  return {
    "--theme-primary": theme.theme_primary,
    "--theme-secondary": theme.theme_secondary,
    "--theme-glow-intensity": `${theme.glow_intensity}%`,
    "--theme-motion-intensity": String(theme.motion_intensity),
  } as Record<string, string>;
}
