export interface LandingVariant {
  id: string;
  slug: string; // URL slug e.g. "healthcare"
  industry: string; // Display name e.g. "Healthcare"
  headline: string;
  subheadline: string;
  cta_text: string;
  meta_title: string;
  meta_description: string;
  featured_industries: string[]; // Filter case studies by these industries
  is_published: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}
