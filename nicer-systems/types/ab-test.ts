export interface ABTestVariant {
  id: string;
  name: string;
  headline: string;
  subheadline: string;
  cta_text: string;
  weight: number; // 0-100, distribution percentage
}

export interface ABTest {
  id: string;
  name: string;
  target_page: string; // e.g. "landing", "industry/logistics"
  element: string; // e.g. "hero", "cta"
  variants: ABTestVariant[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
