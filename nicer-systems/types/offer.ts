export interface Offer {
  id: string;
  name: string;
  price: string;
  description: string;
  features: string[];
  cta: string;
  highlighted: boolean;
  is_published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}
