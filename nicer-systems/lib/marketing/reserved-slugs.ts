export const RESERVED_MARKETING_SLUGS = [
  "admin",
  "api",
  "case-studies",
  "contact",
  "plan",
  "preview",
  "privacy",
  "terms",
] as const;

export function isReservedMarketingSlug(slug: string) {
  return RESERVED_MARKETING_SLUGS.includes(
    slug as (typeof RESERVED_MARKETING_SLUGS)[number]
  );
}
