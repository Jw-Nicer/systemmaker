export type OfferCtaAction = "audit" | "contact" | "booking";

export interface Offer {
  id: string;
  name: string;
  price: string;
  description: string;
  features: string[];
  cta: string;
  cta_action?: OfferCtaAction;
  highlighted: boolean;
  is_published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}
