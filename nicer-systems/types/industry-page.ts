export interface IndustryPage {
  id: string;
  slug: string;
  industry_name: string;
  hero_headline: string;
  hero_subheadline: string;
  pain_points: string[];
  cta_primary_text: string;
  cta_secondary_text: string;
  meta_title: string;
  meta_description: string;
  is_published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}
