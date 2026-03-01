import { getSiteSettings } from "@/lib/firestore/site-settings";
import ThemeCustomizer from "./ThemeCustomizer";

export default async function AdminSettingsPage() {
  const settings = await getSiteSettings();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Theme Settings</h1>
      <p className="text-muted mb-8">
        Customize your site&apos;s colors, glow, and motion effects.
      </p>

      <ThemeCustomizer initialSettings={settings} />
    </div>
  );
}
