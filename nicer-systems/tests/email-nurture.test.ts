import { test, describe } from "vitest";
import assert from "node:assert/strict";
import {
  renderQuickTipEmail,
  renderCaseStudyEmail,
  renderROIEmail,
  renderFinalCTAEmail,
} from "@/lib/email/nurture-templates";

describe("nurture email templates", () => {
  const ctx = { name: "Jane Doe", industry: "healthcare", bottleneck: "manual patient intake forms" };

  describe("renderQuickTipEmail", () => {
    test("returns subject and html", () => {
      const result = renderQuickTipEmail(ctx);
      assert.ok(result.subject);
      assert.ok(result.html);
    });

    test("subject includes first name", () => {
      const result = renderQuickTipEmail(ctx);
      assert.ok(result.subject.includes("Jane"));
    });

    test("html includes first name greeting", () => {
      const result = renderQuickTipEmail(ctx);
      assert.ok(result.html.includes("Hi Jane"));
    });

    test("html references bottleneck when provided", () => {
      const result = renderQuickTipEmail(ctx);
      assert.ok(result.html.includes("manual patient intake forms"));
    });

    test("html uses fallback when no bottleneck", () => {
      const result = renderQuickTipEmail({ name: "Jane Doe" });
      assert.ok(result.html.includes("your workflow challenges"));
    });
  });

  describe("renderCaseStudyEmail", () => {
    test("returns subject and html", () => {
      const result = renderCaseStudyEmail(ctx);
      assert.ok(result.subject);
      assert.ok(result.html);
    });

    test("subject references industry when provided", () => {
      const result = renderCaseStudyEmail(ctx);
      assert.ok(result.subject.includes("healthcare"));
    });

    test("subject uses fallback when no industry", () => {
      const result = renderCaseStudyEmail({ name: "Jane Doe" });
      assert.ok(result.subject.includes("like yours"));
    });

    test("html includes case studies link", () => {
      const result = renderCaseStudyEmail(ctx);
      assert.ok(result.html.includes("/case-studies"));
    });
  });

  describe("renderROIEmail", () => {
    test("returns subject and html", () => {
      const result = renderROIEmail(ctx);
      assert.ok(result.subject);
      assert.ok(result.html);
    });

    test("html includes ROI calculation", () => {
      const result = renderROIEmail(ctx);
      assert.ok(result.html.includes("Annual savings"));
    });

    test("html includes contact CTA", () => {
      const result = renderROIEmail(ctx);
      assert.ok(result.html.includes("/contact"));
    });
  });

  describe("renderFinalCTAEmail", () => {
    test("returns subject and html", () => {
      const result = renderFinalCTAEmail(ctx);
      assert.ok(result.subject);
      assert.ok(result.html);
    });

    test("subject mentions Preview Plan", () => {
      const result = renderFinalCTAEmail(ctx);
      assert.ok(result.subject.includes("Preview Plan"));
    });

    test("html includes booking CTA", () => {
      const result = renderFinalCTAEmail(ctx);
      assert.ok(result.html.includes("Book a Scoping Call"));
    });
  });

  describe("all templates share wrapper", () => {
    test("all templates include Nicer Systems branding", () => {
      const templates = [
        renderQuickTipEmail(ctx),
        renderCaseStudyEmail(ctx),
        renderROIEmail(ctx),
        renderFinalCTAEmail(ctx),
      ];
      for (const t of templates) {
        assert.ok(t.html.includes("Nicer Systems"), `Missing branding in: ${t.subject}`);
      }
    });

    test("all templates include unsubscribe-area footer", () => {
      const templates = [
        renderQuickTipEmail(ctx),
        renderCaseStudyEmail(ctx),
        renderROIEmail(ctx),
        renderFinalCTAEmail(ctx),
      ];
      for (const t of templates) {
        assert.ok(t.html.includes("nicersystems.com"), `Missing footer in: ${t.subject}`);
      }
    });
  });
});
