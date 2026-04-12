"use server";

import { getAdminDb } from "@/lib/firebase/admin";
import { getSessionUser } from "@/lib/firebase/auth";
import { buildLeadsCSV, filterLeadsForExport } from "@/lib/leads/export";
import { revalidatePath } from "next/cache";
import type { ExperimentAssignment } from "@/types/experiment";
import type { GuidedAuditResponses } from "@/types/audit";
import type { ActionResult } from "./types";
import { LEAD_STATUSES } from "@/types/lead";
import { dispatchCRMWebhook } from "@/lib/crm/sync";
import type { Lead, LeadExportFilters, LeadStatus } from "@/types/lead";

function toISOOrPassthrough(value: unknown): string | undefined {
  if (value && typeof value === "object" && typeof (value as { toDate?: unknown }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return typeof value === "string" ? value : undefined;
}

function serializeLead(id: string, data: Record<string, unknown>): Lead {
  return {
    id,
    name: (data.name as string) ?? "",
    email: (data.email as string) ?? "",
    company: (data.company as string) ?? "",
    bottleneck: (data.bottleneck as string) ?? "",
    tools: (data.tools as string) ?? "",
    urgency: (data.urgency as string) ?? "",
    status: ((data.status as string) ?? "new") as LeadStatus,
    source: (data.source as string) ?? "contact",
    score: (data.score as number) ?? undefined,
    nurture_enrolled: (data.nurture_enrolled as boolean) ?? false,
    preview_plan_sent_at: toISOOrPassthrough(data.preview_plan_sent_at),
    plan_id: data.plan_id as string | undefined,
    follow_up_at: toISOOrPassthrough(data.follow_up_at),
    follow_up_note: data.follow_up_note as string | undefined,
    utm_source: data.utm_source as string | undefined,
    utm_medium: data.utm_medium as string | undefined,
    utm_campaign: data.utm_campaign as string | undefined,
    landing_path: data.landing_path as string | undefined,
    experiment_assignments: Array.isArray(data.experiment_assignments)
      ? (data.experiment_assignments as ExperimentAssignment[])
      : undefined,
    audit_summary: data.audit_summary as string | undefined,
    audit_responses: data.audit_responses as GuidedAuditResponses | undefined,
    created_at: toISOOrPassthrough(data.created_at) ?? new Date().toISOString(),
  };
}

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

    return snap.docs.map((doc) => serializeLead(doc.id, doc.data()));
  } catch (err) {
    console.error("[actions] getAllLeads failed:", err);
    return [];
  }
}

export async function updateLeadStatus(
  id: string,
  status: string
): Promise<ActionResult> {
  try {
    const user = await requireAuth();
    if (!(LEAD_STATUSES as readonly string[]).includes(status)) {
      return { success: false, error: "Invalid status" };
    }
    const db = getAdminDb();
    const docRef = db.collection("leads").doc(id);
    const doc = await docRef.get();
    const oldStatus = doc.data()?.status ?? "unknown";

    await docRef.update({
      status,
      updated_at: new Date(),
    });

    // Auto-log status change in activity timeline
    await docRef.collection("activity").add({
      type: "status_change",
      content: `${oldStatus} → ${status}`,
      author: user.email,
      created_at: new Date(),
    });

    // Fire-and-forget CRM webhook (5D)
    dispatchCRMWebhook("lead_status_changed", {
      lead_id: id,
      old_status: oldStatus,
      new_status: status,
    }).catch(() => {});

    revalidatePath("/admin/leads");
    revalidatePath(`/admin/leads/${id}`);
    return { success: true };
  } catch (err) {
    console.error("[actions] updateLeadStatus failed:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to update lead status" };
  }
}

export async function getLead(id: string): Promise<Lead | null> {
  await requireAuth();
  try {
    const db = getAdminDb();
    const doc = await db.collection("leads").doc(id).get();
    if (!doc.exists) return null;
    return serializeLead(doc.id, doc.data()!);
  } catch (err) {
    console.error("[actions] getLead failed:", err);
    return null;
  }
}

export async function setLeadFollowUp(
  id: string,
  date: string,
  note?: string
): Promise<ActionResult> {
  try {
    const user = await requireAuth();
    const db = getAdminDb();
    const docRef = db.collection("leads").doc(id);

    await docRef.update({
      follow_up_at: new Date(date + "T12:00:00"),
      follow_up_note: note || "",
      updated_at: new Date(),
    });

    await docRef.collection("activity").add({
      type: "note",
      content: `Follow-up set for ${new Date(date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}${note ? `: ${note}` : ""}`,
      author: user.email,
      created_at: new Date(),
    });

    revalidatePath("/admin/leads");
    revalidatePath(`/admin/leads/${id}`);
    revalidatePath("/admin");
    return { success: true };
  } catch (err) {
    console.error("[actions] setLeadFollowUp failed:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to set follow-up" };
  }
}

export async function clearLeadFollowUp(
  id: string
): Promise<ActionResult> {
  try {
    await requireAuth();
    const db = getAdminDb();
    const { FieldValue } = await import("@/lib/firebase/admin");
    await db.collection("leads").doc(id).update({
      follow_up_at: FieldValue.delete(),
      follow_up_note: FieldValue.delete(),
      updated_at: new Date(),
    });
    revalidatePath("/admin/leads");
    revalidatePath(`/admin/leads/${id}`);
    revalidatePath("/admin");
    return { success: true };
  } catch (err) {
    console.error("[actions] clearLeadFollowUp failed:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to clear follow-up" };
  }
}

export async function getFollowUps(): Promise<Lead[]> {
  await requireAuth();
  try {
    const db = getAdminDb();
    const snap = await db
      .collection("leads")
      .where("follow_up_at", "!=", null)
      .orderBy("follow_up_at", "asc")
      .get();

    return snap.docs
      .filter((doc) => {
        const status = doc.data().status;
        return status !== "closed" && status !== "unqualified" && status !== "lost";
      })
      .map((doc) => serializeLead(doc.id, doc.data()));
  } catch (err) {
    console.error("[actions] getFollowUps failed:", err);
    return [];
  }
}

export async function exportLeadsCSV(
  filters: LeadExportFilters = {}
): Promise<string> {
  const leads = await getAllLeads();
  return buildLeadsCSV(filterLeadsForExport(leads, filters));
}
