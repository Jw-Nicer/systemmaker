import { getPublishedFAQs } from "@/lib/firestore/faqs";
import { FAQAccordion } from "./FAQAccordion";

export async function FAQSection({
  eyebrow = "FAQ",
  title = "Common questions",
  description = "",
}: {
  eyebrow?: string;
  title?: string;
  description?: string;
} = {}) {
  const faqs = await getPublishedFAQs();
  if (faqs.length === 0) {
    return null;
  }

  const faqJsonLd = {
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
  };

  return (
    <section id="faq" className="border-b border-[var(--border-light)] bg-[var(--cream-bg)] py-16 sm:py-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
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
        <FAQAccordion faqs={faqs} />
      </div>
    </section>
  );
}
