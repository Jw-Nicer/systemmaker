import type { LandingVariantSections } from "@/types/variant";
import { normalizeVariantSections } from "@/lib/marketing/variant-content";

export type FormData = {
  slug: string;
  industry: string;
  meta_title: string;
  meta_description: string;
  sections: LandingVariantSections;
};

export const emptyForm: FormData = {
  slug: "",
  industry: "",
  meta_title: "",
  meta_description: "",
  sections: normalizeVariantSections(null),
};

export function inputClassName() {
  return "w-full rounded-[18px] border border-[#d7d0c1] bg-[#fbf7ef] px-4 py-3 text-sm text-[#1d2318] outline-none transition-colors focus:border-[#92a07a]";
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const CHAR_LIMITS = {
  headline: 300,
  subheadline: 500,
  meta_title: 200,
  meta_description: 500,
  cta_text: 100,
  proof_line: 500,
} as const;

export type TabKey = "identity" | "hero" | "demo-proof" | "how-it-works" | "features" | "pricing-faq-cta";

export const TABS: { key: TabKey; label: string }[] = [
  { key: "identity", label: "Identity" },
  { key: "hero", label: "Hero" },
  { key: "demo-proof", label: "Demo + Proof" },
  { key: "how-it-works", label: "How It Works" },
  { key: "features", label: "Features" },
  { key: "pricing-faq-cta", label: "Pricing + FAQ + CTA" },
];

export type VariantAnalytics = {
  views: number;
  leads: number;
};
