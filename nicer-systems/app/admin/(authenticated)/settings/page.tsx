import { getSiteSettings } from "@/lib/firestore/site-settings";
import { getCRMConfig } from "@/lib/crm-sync";
import ThemeCustomizer from "./ThemeCustomizer";
import CRMSettings from "./CRMSettings";

export default async function AdminSettingsPage() {
  const settings = await getSiteSettings();
  const crmConfig = await getCRMConfig();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Settings</h1>
      <p className="text-muted mb-8">
        Customize your site&apos;s theme and integrations.
      </p>

      <div className="space-y-12">
        <section>
          <h2 className="text-lg font-semibold mb-4">Theme</h2>
          <ThemeCustomizer initialSettings={settings} />
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-4">CRM Integration</h2>
          <CRMSettings
            initialConfig={crmConfig ?? {
              webhook_url: "",
              is_active: false,
              provider: "custom",
              secret_header: "",
              secret_value: "",
            }}
          />
        </section>
      </div>
    </div>
  );
}
