export interface ExperimentVariant {
  key: string; // e.g. "control", "variant_a"
  label: string; // Display name
  value: string; // The content (headline text, CTA text, etc.)
  weight: number; // Traffic weight 0-100
}

export interface ExperimentAssignment {
  experiment_id: string;
  experiment_name: string;
  target: string;
  variant_key: string;
  variant_label: string;
}

export interface Experiment {
  id: string;
  name: string;
  target: string; // What to test: "hero_headline", "hero_cta", "final_cta"
  variants: ExperimentVariant[];
  status: "draft" | "running" | "stopped" | "completed";
  winner?: string; // key of winning variant
  created_at?: string;
  updated_at?: string;
}
