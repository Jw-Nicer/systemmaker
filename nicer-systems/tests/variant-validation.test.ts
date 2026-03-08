import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { variantSchema } from "../lib/validation";

describe("variantSchema validation in actions", () => {
  it("accepts a valid variant payload", () => {
    const result = variantSchema.safeParse({
      slug: "healthcare",
      industry: "Healthcare",
      headline: "Automate Your Healthcare Admin",
      subheadline: "Reduce paperwork by 80%",
      cta_text: "Get Started",
      meta_title: "Healthcare Automation | Nicer Systems",
      meta_description: "Automate admin tasks for healthcare businesses.",
      featured_industries: ["healthcare", "medical"],
    });
    assert.ok(result.success, "Should accept valid variant");
  });

  it("rejects a variant with empty slug", () => {
    const result = variantSchema.safeParse({
      slug: "",
      industry: "Healthcare",
      headline: "Test",
      subheadline: "Test",
      cta_text: "Test",
      meta_title: "Test",
      meta_description: "Test",
      featured_industries: [],
    });
    assert.ok(!result.success, "Should reject empty slug");
  });

  it("rejects a variant with invalid slug format", () => {
    const result = variantSchema.safeParse({
      slug: "Has Spaces",
      industry: "Healthcare",
      headline: "Test",
      subheadline: "Test",
      cta_text: "Test",
      meta_title: "Test",
      meta_description: "Test",
      featured_industries: [],
    });
    assert.ok(!result.success, "Should reject slug with spaces");
  });

  it("partial schema accepts a subset of fields for updates", () => {
    const partialSchema = variantSchema.partial();
    const result = partialSchema.safeParse({
      headline: "Updated headline",
    });
    assert.ok(result.success, "Should accept partial update with only headline");
  });

  it("partial schema still validates individual field constraints", () => {
    const partialSchema = variantSchema.partial();
    const result = partialSchema.safeParse({
      slug: "UPPERCASE-NOT-ALLOWED",
    });
    // Slug regex requires lowercase
    assert.ok(!result.success, "Should reject invalid slug even in partial mode");
  });

  it("partial schema accepts section-level updates", () => {
    const partialSchema = variantSchema.partial();
    const result = partialSchema.safeParse({
      sections: {
        hero: {
          headline: "Updated hero",
          subheadline: "Updated subheadline",
          cta_text: "Get started",
          proof_line: "Updated proof line",
        },
        demo: {
          eyebrow: "Demo",
          title: "Build a plan",
          description: "Updated demo copy",
        },
        proof: {
          eyebrow: "Proof",
          title: "Results",
          description: "Updated proof copy",
          featured_industries: ["healthcare"],
        },
        how_it_works: {
          eyebrow: "How it works",
          title: "Process",
          steps: [{ id: "01", title: "Step 1", description: "Describe the problem" }],
        },
        features: {
          eyebrow: "Features",
          title: "Deliverables",
          items: [
            {
              id: "01",
              title: "Map",
              description: "Workflow map",
              visual: "diagram",
            },
          ],
        },
        pricing: {
          eyebrow: "Pricing",
          title: "Pricing title",
          description: "Pricing description",
        },
        faq: {
          eyebrow: "FAQ",
          title: "Questions",
          description: "",
        },
        final_cta: {
          eyebrow: "Ready",
          title: "Ship it",
          description: "Final CTA description",
          cta_text: "Talk to us",
        },
      },
    });

    assert.ok(result.success, "Should accept structured section updates");
  });
});
