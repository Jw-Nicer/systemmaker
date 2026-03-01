import { getAdminDb } from "@/lib/firebase/admin";
import type { EmailSequence, SequenceEnrollment } from "@/types/email-sequence";

export async function getActiveSequenceByTrigger(
  trigger: EmailSequence["trigger"]
): Promise<EmailSequence | null> {
  try {
    const db = getAdminDb();
    const snap = await db
      .collection("email_sequences")
      .where("is_active", "==", true)
      .where("trigger", "==", trigger)
      .limit(1)
      .get();

    if (snap.empty) return null;
    const doc = snap.docs[0];
    return { id: doc.id, ...doc.data() } as EmailSequence;
  } catch {
    return null;
  }
}

export async function getDueEnrollments(): Promise<SequenceEnrollment[]> {
  try {
    const db = getAdminDb();
    const now = new Date().toISOString();
    const snap = await db
      .collection("sequence_enrollments")
      .where("status", "==", "active")
      .where("next_send_at", "<=", now)
      .limit(50)
      .get();

    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as SequenceEnrollment);
  } catch {
    return [];
  }
}

export async function enrollLead(
  leadId: string,
  sequenceId: string,
  firstStepDelayDays: number
): Promise<string> {
  const db = getAdminDb();
  const nextSend = new Date();
  nextSend.setDate(nextSend.getDate() + firstStepDelayDays);

  const ref = await db.collection("sequence_enrollments").add({
    lead_id: leadId,
    sequence_id: sequenceId,
    current_step: 0,
    next_send_at: nextSend.toISOString(),
    status: "active",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  return ref.id;
}
