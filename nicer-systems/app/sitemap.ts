import type { MetadataRoute } from "next";
import { getPublishedCaseStudies } from "@/lib/firestore/case-studies";
import { getPublishedVariants } from "@/lib/firestore/variants";

const BASE_URL = "https://nicer-systems.web.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [caseStudies, variants] = await Promise.all([
    getPublishedCaseStudies(),
    getPublishedVariants(),
  ]);

  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${BASE_URL}/contact`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/case-studies`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE_URL}/faq`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/privacy`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.2 },
    { url: `${BASE_URL}/terms`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.2 },
  ];

  const caseStudyPages: MetadataRoute.Sitemap = caseStudies.map((cs) => ({
    url: `${BASE_URL}/case-studies/${cs.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  const variantPages: MetadataRoute.Sitemap = variants.map((v) => ({
    url: `${BASE_URL}/${v.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [...staticPages, ...caseStudyPages, ...variantPages];
}
