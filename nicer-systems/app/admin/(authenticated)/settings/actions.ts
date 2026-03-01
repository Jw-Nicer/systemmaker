"use server";

import { getSessionUser } from "@/lib/firebase/auth";
import { updateSiteSettings } from "@/lib/firestore/site-settings";
import type { ThemeSettings } from "@/lib/theme";

const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const GRADIENT_PRESETS = [
  "dark-navy",
  "midnight-purple",
  "deep-ocean",
  "charcoal",
  "obsidian",
];
const BRUSH_STYLES = ["soft", "hard", "spray"];

export async function saveThemeSettings(settings: ThemeSettings) {
  const user = await getSessionUser();
  if (!user) {
    return { error: "Unauthorized" };
  }

  // Validate
  if (!HEX_RE.test(settings.theme_primary)) {
    return { error: "Invalid primary color" };
  }
  if (!HEX_RE.test(settings.theme_secondary)) {
    return { error: "Invalid secondary color" };
  }
  if (!GRADIENT_PRESETS.includes(settings.gradient_preset)) {
    return { error: "Invalid gradient preset" };
  }
  if (
    typeof settings.glow_intensity !== "number" ||
    settings.glow_intensity < 0 ||
    settings.glow_intensity > 100
  ) {
    return { error: "Glow intensity must be 0-100" };
  }
  if (
    typeof settings.motion_intensity !== "number" ||
    settings.motion_intensity < 0 ||
    settings.motion_intensity > 3
  ) {
    return { error: "Motion intensity must be 0-3" };
  }
  if (!BRUSH_STYLES.includes(settings.brush_style)) {
    return { error: "Invalid brush style" };
  }

  try {
    await updateSiteSettings(settings);
    return { success: true };
  } catch {
    return { error: "Failed to save settings" };
  }
}
