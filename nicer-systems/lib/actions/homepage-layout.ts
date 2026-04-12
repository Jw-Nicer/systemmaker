"use server";

import { getSessionUser } from "@/lib/firebase/auth";
import { homepageLayoutSchema } from "@/lib/validation";
import {
  getHomepageLayoutForAdmin,
  writeHomepageLayout,
  resetHomepageLayoutToDefault,
} from "@/lib/firestore/homepage-layout";
import type { HomepageLayout } from "@/types/homepage-layout";
import { resolveHomepageLayout } from "@/lib/marketing/homepage-layout-resolver";
import { revalidatePath, revalidateTag } from "next/cache";
import type { ActionResult } from "./types";

async function requireAuth() {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

export async function getHomepageLayoutAction(): Promise<HomepageLayout> {
  await requireAuth();
  return getHomepageLayoutForAdmin();
}

export async function updateHomepageLayout(
  data: unknown
): Promise<ActionResult> {
  try {
    await requireAuth();
    const parsed = homepageLayoutSchema.safeParse(data);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Validation failed",
      };
    }

    // Run the raw parsed input through the resolver so unknown keys,
    // duplicates, and missing keys are handled consistently with the
    // read path. The admin UI shouldn't ever send a malformed layout,
    // but this keeps the persisted state canonical regardless.
    const resolved = resolveHomepageLayout({ sections: parsed.data.sections });

    await writeHomepageLayout(resolved);

    revalidateTag("homepage-layout", "max");
    revalidatePath("/admin/homepage-layout");
    revalidatePath("/");
    return { success: true };
  } catch (err) {
    console.error("[actions] updateHomepageLayout failed:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update layout",
    };
  }
}

export async function resetHomepageLayout(): Promise<ActionResult> {
  try {
    await requireAuth();
    await resetHomepageLayoutToDefault();
    revalidateTag("homepage-layout", "max");
    revalidatePath("/admin/homepage-layout");
    revalidatePath("/");
    return { success: true };
  } catch (err) {
    console.error("[actions] resetHomepageLayout failed:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to reset layout",
    };
  }
}
