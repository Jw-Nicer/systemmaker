import Link from "next/link";
import { getPublishedFAQs } from "@/lib/firestore/faqs";
import { FAQAccordion } from "./FAQAccordion";
import type { FAQ } from "@/types/faq";

export async function FAQSection({
  eyebrow = "FAQ",
  title = "Common questions",
  description = "",
  faqsData,
}: {
  eyebrow?: string;
  title?: string;
  description?: string;
  faqsData?: FAQ[];
} = {}) {
  const faqs = faqsData ?? await getPublishedFAQs();

  const faqJsonLd = faqs.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  } : null;

  return (
    <section id="faq" className="border-b border-[var(--border-light)] bg-[var(--cream-bg)] py-16 sm:py-24">
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="mb-10 sm:mb-12">
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-muted)] sm:tracking-[0.3em]">
            {eyebrow}
          </p>
          <h2 className="mt-4 font-[var(--font-editorial)] text-4xl leading-[0.96] tracking-[-0.04em] text-[var(--text-heading)] sm:text-5xl md:text-6xl">
            {title}
          </h2>
          {description ? (
            <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--text-body)]">
              {description}
            </p>
          ) : null}
        </div>
        {faqs.length > 0 ? (
          <FAQAccordion faqs={faqs} />
        ) : (
          <div className="rounded-[var(--radius-card)] border border-[var(--border-card)] bg-[var(--cream-card)] px-6 py-8 text-center">
            <p className="text-base text-[var(--text-heading)]">
              Have a question we haven&apos;t covered?
            </p>
            <Link
              href="/contact"
              className="mt-4 inline-flex rounded-full bg-[var(--green-dark)] px-6 py-2.5 text-sm font-medium text-[#f5f0e5] transition-all duration-300 hover:scale-[1.02]"
            >
              Get in touch
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
