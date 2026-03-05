import { getAdminDb } from "@/lib/firebase/admin";
import { unstable_cache } from "next/cache";
import type { ThemeSettings } from "@/lib/theme";
import { DEFAULT_THEME } from "@/lib/theme";

const COLLECTION = "site_settings";
const DOC_ID = "default";

const DEFAULT_SETTINGS: ThemeSettings = {
  theme_primary: DEFAULT_THEME.primary,
  theme_secondary: DEFAULT_THEME.secondary,
  gradient_preset: DEFAULT_THEME.gradientPreset,
  glow_intensity: DEFAULT_THEME.glowIntensity,
  motion_intensity: DEFAULT_THEME.motionIntensity,
  brush_style: DEFAULT_THEME.brushStyle,
};

async function fetchSiteSettings(): Promise<ThemeSettings> {
  try {
    const db = getAdminDb();
    const doc = await db.collection(COLLECTION).doc(DOC_ID).get();

    if (!doc.exists) return DEFAULT_SETTINGS;

    const data = doc.data()!;
    return {
      theme_primary: data.theme_primary ?? DEFAULT_THEME.primary,
      theme_secondary: data.theme_secondary ?? DEFAULT_THEME.secondary,
      gradient_preset: data.gradient_preset ?? DEFAULT_THEME.gradientPreset,
      glow_intensity: data.glow_intensity ?? DEFAULT_THEME.glowIntensity,
      motion_intensity: data.motion_intensity ?? DEFAULT_THEME.motionIntensity,
      brush_style: data.brush_style ?? DEFAULT_THEME.brushStyle,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export const getSiteSettings = unstable_cache(
  fetchSiteSettings,
  ["site-settings"],
  { revalidate: 300, tags: ["site-settings"] }
);

export async function updateSiteSettings(
  settings: ThemeSettings
): Promise<void> {
  const db = getAdminDb();
  await db
    .collection(COLLECTION)
    .doc(DOC_ID)
    .set({ ...settings, updated_at: new Date() }, { merge: true });
}
