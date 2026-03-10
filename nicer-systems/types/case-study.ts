export type CaseStudyStatus = "draft" | "review" | "published" | "archived";

export type ResultCategory =
  | "time_saved"
  | "error_reduction"
  | "cost_reduction"
  | "visibility_gained"
  | "throughput_increase"
  | "compliance_achieved";

export const RESULT_CATEGORIES: { value: ResultCategory; label: string }[] = [
  { value: "time_saved", label: "Time Saved" },
  { value: "error_reduction", label: "Error Reduction" },
  { value: "cost_reduction", label: "Cost Reduction" },
  { value: "visibility_gained", label: "Visibility Gained" },
  { value: "throughput_increase", label: "Throughput Increase" },
  { value: "compliance_achieved", label: "Compliance Achieved" },
];

export interface CaseStudy {
  id: string;
  title: string;
  slug: string;
  client_name: string;
  industry: string;
  workflow_type: string;
  tools: string[];
  challenge: string;
  solution: string;
  metrics: { label: string; before: string; after: string }[];
  result_categories: ResultCategory[];
  thumbnail_url: string;
  status: CaseStudyStatus;
  /** @deprecated Use status === "published" instead. Kept for useCrudManager compat. */
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  sort_order: number;
}
