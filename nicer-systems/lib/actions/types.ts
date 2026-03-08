/** Standard return type for all server actions that mutate data. */
export type ActionResult<T = void> = T extends void
  ? { success: boolean; error?: string }
  : { success: boolean; error?: string } & Partial<T>;
