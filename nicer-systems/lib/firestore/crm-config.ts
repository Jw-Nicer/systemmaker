import { getAdminDb } from "@/lib/firebase/admin";

const COLLECTION = "site_settings";
const DOC_ID = "crm_config";

export interface CRMConfig {
  webhook_url: string;
  webhook_secret: string;
  enabled: boolean;
  events: string[];
  updated_at?: string;
}

export async function getCRMConfig(): Promise<CRMConfig | null> {
  try {
    const db = getAdminDb();
    const doc = await db.collection(COLLECTION).doc(DOC_ID).get();
    if (!doc.exists) return null;
    return doc.data() as CRMConfig;
  } catch (err) {
    console.error("[crm-config] getCRMConfig failed:", err);
    return null;
  }
}

export async function updateCRMConfig(
  config: Partial<CRMConfig>
): Promise<void> {
  const db = getAdminDb();
  await db
    .collection(COLLECTION)
    .doc(DOC_ID)
    .set({ ...config, updated_at: new Date().toISOString() }, { merge: true });
}
