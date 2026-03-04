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
  score?: number;
  nurture_enrolled?: boolean;
  preview_plan_sent_at?: string;
  follow_up_at?: string;
  follow_up_note?: string;
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
        score: data.score ?? undefined,
        nurture_enrolled: data.nurture_enrolled ?? false,
        preview_plan_sent_at: data.preview_plan_sent_at?.toDate?.()
          ? data.preview_plan_sent_at.toDate().toISOString()
          : data.preview_plan_sent_at,
        follow_up_at: data.follow_up_at?.toDate?.()
          ? data.follow_up_at.toDate().toISOString()
          : data.follow_up_at,
        follow_up_note: data.follow_up_note,
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
  const user = await requireAuth();
  if (!VALID_STATUSES.includes(status)) {
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

  revalidatePath("/admin/leads");
  revalidatePath(`/admin/leads/${id}`);
  return { success: true };
}

export async function getLead(id: string): Promise<Lead | null> {
  await requireAuth();
  try {
    const db = getAdminDb();
    const doc = await db.collection("leads").doc(id).get();
    if (!doc.exists) return null;
    const data = doc.data()!;
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
      score: data.score ?? undefined,
      nurture_enrolled: data.nurture_enrolled ?? false,
      preview_plan_sent_at: data.preview_plan_sent_at?.toDate?.()
        ? data.preview_plan_sent_at.toDate().toISOString()
        : data.preview_plan_sent_at,
      follow_up_at: data.follow_up_at?.toDate?.()
        ? data.follow_up_at.toDate().toISOString()
        : data.follow_up_at,
      follow_up_note: data.follow_up_note,
      utm_source: data.utm_source,
      utm_medium: data.utm_medium,
      utm_campaign: data.utm_campaign,
      landing_path: data.landing_path,
      created_at: data.created_at?.toDate?.()
        ? data.created_at.toDate().toISOString()
        : typeof data.created_at === "string"
          ? data.created_at
          : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export async function setLeadFollowUp(
  id: string,
  date: string,
  note?: string
): Promise<{ success: boolean; error?: string }> {
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
}

export async function clearLeadFollowUp(
  id: string
): Promise<{ success: boolean }> {
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
        return status !== "closed" && status !== "unqualified";
      })
      .map((doc) => {
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
          score: data.score ?? undefined,
          nurture_enrolled: data.nurture_enrolled ?? false,
          preview_plan_sent_at: data.preview_plan_sent_at?.toDate?.()
            ? data.preview_plan_sent_at.toDate().toISOString()
            : data.preview_plan_sent_at,
          follow_up_at: data.follow_up_at?.toDate?.()
            ? data.follow_up_at.toDate().toISOString()
            : data.follow_up_at,
          follow_up_note: data.follow_up_note,
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
    "Score",
    "Nurture",
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
      l.score ?? "",
      l.nurture_enrolled ? "yes" : "no",
      l.created_at,
    ].join(",")
  );

  return [headers.join(","), ...rows].join("\n");
}
