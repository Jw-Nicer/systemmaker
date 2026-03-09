import { getAdminDb } from "@/lib/firebase/admin";
import { unstable_cache } from "next/cache";
import type { Testimonial } from "@/types/testimonial";
import { serializeDoc } from "./serialize";

export const getPublishedTestimonials = unstable_cache(
  async (): Promise<Testimonial[]> => {
    try {
      const db = getAdminDb();
      const snap = await db
        .collection("testimonials")
        .where("is_published", "==", true)
        .orderBy("sort_order", "asc")
        .get();

      return snap.docs.map((doc) => serializeDoc<Testimonial>(doc));
    } catch (err) {
      console.error("[firestore] getPublishedTestimonials failed:", err);
      return [];
    }
  },
  ["published-testimonials"],
  { revalidate: 60, tags: ["testimonials"] }
);

export async function getAllTestimonialsForPreview(): Promise<Testimonial[]> {
  try {
    const db = getAdminDb();
    const snap = await db
      .collection("testimonials")
      .orderBy("sort_order", "asc")
      .get();
    return snap.docs.map((doc) => serializeDoc<Testimonial>(doc));
  } catch (err) {
    console.error("[firestore] getAllTestimonialsForPreview failed:", err);
    return [];
  }
}
