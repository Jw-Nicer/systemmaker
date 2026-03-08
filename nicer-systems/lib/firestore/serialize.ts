import type { DocumentData, DocumentSnapshot, QueryDocumentSnapshot } from "firebase-admin/firestore";

/**
 * Convert a Firestore document snapshot into a plain object safe for
 * passing from Server Components to Client Components.
 *
 * Firestore Timestamp instances (which are class objects) are converted
 * to ISO-8601 strings. Everything else passes through unchanged.
 *
 * Accepts both QueryDocumentSnapshot (from queries) and DocumentSnapshot
 * (from doc().get()). Caller must verify doc.exists before passing a
 * DocumentSnapshot.
 */
export function serializeDoc<T>(doc: QueryDocumentSnapshot<DocumentData> | DocumentSnapshot<DocumentData>): T {
    const data = doc.data()!;
    const serialized: Record<string, unknown> = { id: doc.id };

    for (const [key, value] of Object.entries(data)) {
        if (value && typeof value === "object" && typeof value.toDate === "function") {
            serialized[key] = value.toDate().toISOString();
        } else {
            serialized[key] = value;
        }
    }

    return serialized as T;
}
