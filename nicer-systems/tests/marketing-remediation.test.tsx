import { describe, test } from "vitest";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { getPublicCaseStudies } from "@/lib/firestore/case-studies";
import { FALLBACK_CASE_STUDIES } from "@/lib/marketing/fallback-case-studies";
import { buildNavLinks } from "@/app/(marketing)/layout";
import { FAQAccordion } from "@/components/marketing/FAQAccordion";

describe("marketing remediation", () => {
  test("falls back to bundled case studies when live content is unavailable", () => {
    assert.deepEqual(getPublicCaseStudies([]), FALLBACK_CASE_STUDIES);
  });

  test("prefers live case studies when content is available", () => {
    const liveCaseStudy = {
      ...FALLBACK_CASE_STUDIES[0],
      id: "live-study",
      slug: "live-study",
      title: "Live study",
    };

    assert.deepEqual(getPublicCaseStudies([liveCaseStudy]), [liveCaseStudy]);
  });

  test("nav does not show a Soon badge when case studies are publicly available", () => {
    const caseStudiesLink = buildNavLinks(true).find((link) => link.label === "Case Studies");
    assert.equal(caseStudiesLink?.badge, undefined);
  });

  test("nav shows a Soon badge only when no public case studies are available", () => {
    const caseStudiesLink = buildNavLinks(false).find((link) => link.label === "Case Studies");
    assert.equal(caseStudiesLink?.badge, "Soon");
  });

  test("FAQ accordion renders accessible trigger and panel wiring", () => {
    const markup = renderToStaticMarkup(
      <FAQAccordion
        faqs={[
          {
            id: "faq-1",
            question: "What industries do you work with?",
            answer: "We work with admin-heavy businesses.",
            sort_order: 0,
            is_published: true,
          },
        ]}
      />
    );

    assert.match(markup, /aria-expanded="false"/);
    assert.match(markup, /aria-controls="faq-panel-faq-1"/);
    assert.match(markup, /id="faq-trigger-faq-1"/);
  });
});
