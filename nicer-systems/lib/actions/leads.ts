"use server";

import { getAdminDb } from "@/lib/firebase/admin";
import { getSessionUser } from "@/lib/firebase/auth";
import { revalidatePath } from "next/cache";

export interface Lead {
  id: string;
  name: string;
  email: string;
  company: string;
  bottleneck: string;
  tools: string;
  urgency: string;
  status: string;
  source: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  landing_path?: string;
  created_at: string;
}

const VALID_STATUSES = ["new", "qualified", "booked", "closed", "unqualified"];

async function requireAuth() {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

export async function getAllLeads(): Promise<Lead[]> {
  await requireAuth();
  try {
    const db = getAdminDb();
    const snap = await db
      .collection("leads")
      .orderBy("created_at", "desc")
      .get();

    return snap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name ?? "",
        email: data.email ?? "",
        company: data.company ?? "",
        bottleneck: data.bottleneck ?? "",
        tools: data.tools ?? "",
        urgency: data.urgency ?? "",
        status: data.status ?? "new",
        source: data.source ?? "contact",
        utm_source: data.utm_source,
        utm_medium: data.utm_medium,
        utm_campaign: data.utm_campaign,
        landing_path: data.landing_path,
        created_at: data.created_at?.toDate?.()
          ? data.created_at.toDate().toISOString()
          : typeof data.created_at === "string"
            ? data.created_at
            : new Date().toISOString(),
      } as Lead;
    });
  } catch {
    return [];
  }
}

export async function updateLeadStatus(
  id: string,
  status: string
): Promise<{ success: boolean; error?: string }> {
  await requireAuth();
  if (!VALID_STATUSES.includes(status)) {
    return { success: false, error: "Invalid status" };
  }
  const db = getAdminDb();
  await db.collection("leads").doc(id).update({
    status,
    updated_at: new Date(),
  });
  revalidatePath("/admin/leads");
  return { success: true };
}

export async function exportLeadsCSV(): Promise<string> {
  const leads = await getAllLeads();
  const headers = [
    "Name",
    "Email",
    "Company",
    "Bottleneck",
    "Tools",
    "Urgency",
    "Status",
    "Source",
    "Created",
  ];

  const rows = leads.map((l) =>
    [
      l.name,
      l.email,
      l.company,
      `"${l.bottleneck.replace(/"/g, '""')}"`,
      l.tools,
      l.urgency,
      l.status,
      l.source,
      l.created_at,
    ].join(",")
  );

  return [headers.join(","), ...rows].join("\n");
}
