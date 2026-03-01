export interface CaseStudy {
  id: string;
  title: string;
  slug: string;
  client_name: string;
  industry: string;
  tools: string[];
  challenge: string;
  solution: string;
  metrics: { label: string; before: string; after: string }[];
  thumbnail_url: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  sort_order: number;
}
