import { getSiteSettings } from "@/lib/firestore/site-settings";
import ThemeCustomizer from "./ThemeCustomizer";
import CRMSettings from "@/components/admin/CRMSettings";

export default async function AdminSettingsPage() {
  const settings = await getSiteSettings();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Settings</h1>
      <p className="text-muted mb-8">
        Customize your site&apos;s theme and configure integrations.
      </p>

      <ThemeCustomizer initialSettings={settings} />

      <CRMSettings />
    </div>
  );
}
