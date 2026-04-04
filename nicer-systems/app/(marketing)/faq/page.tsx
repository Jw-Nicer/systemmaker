import type { Metadata } from "next";
import Link from "next/link";
import { FAQSection } from "@/components/marketing/FAQSection";
import type { FAQ } from "@/types/faq";
import { getPublishedFAQs } from "@/lib/firestore/faqs";

export const metadata: Metadata = {
  title: "FAQ | Nicer Systems",
  description:
    "Frequently asked questions about Nicer Systems — preview plans, pricing, data privacy, and how we automate operations for admin-heavy businesses.",
  openGraph: {
    title: "FAQ | Nicer Systems",
    description:
      "Frequently asked questions about Nicer Systems — preview plans, pricing, data privacy, and how we automate operations for admin-heavy businesses.",
    type: "website",
    siteName: "Nicer Systems",
  },
  twitter: {
    card: "summary",
    title: "FAQ | Nicer Systems",
    description:
      "Frequently asked questions about Nicer Systems — preview plans, pricing, and data privacy.",
  },
};

/* ------------------------------------------------------------------ */
/*  Placeholder FAQs — shown when no FAQs exist in Firestore yet      */
/* ------------------------------------------------------------------ */
const placeholderFAQs: FAQ[] = [
  {
    id: "placeholder-1",
    question: "What's included in the free preview plan?",
    answer:
      "The preview plan gives you a personalised automation blueprint based on the workflow details you share. It includes a mapped-out process diagram, a list of recommended automations, estimated time savings, and a suggested tech stack — all before any paid engagement.",
    sort_order: 1,
    is_published: true,
  },
  {
    id: "placeholder-2",
    question: "How does pricing work?",
    answer:
      "Every engagement starts with a free scoping call and preview plan. From there, projects are scoped and quoted as fixed-price builds so you know exactly what you're paying before work begins. Ongoing maintenance and monitoring plans are available for teams that want continued support.",
    sort_order: 2,
    is_published: true,
  },
  {
    id: "placeholder-3",
    question: "What kind of businesses do you work with?",
    answer:
      "We specialise in admin-heavy businesses — think property management, logistics, compliance-driven services, and any team drowning in spreadsheets, manual data entry, or cross-platform copy-paste. If your team has repetitive operational workflows, we can probably help.",
    sort_order: 3,
    is_published: true,
  },
  {
    id: "placeholder-4",
    question: "How do you handle my data and privacy?",
    answer:
      "We take data privacy seriously. Information you share during the preview-plan process is stored securely in our admin systems and never sold. Analytics tracking is opt-in, and you can manage your preferences at any time from the footer. Full details are available in our Privacy Policy.",
    sort_order: 4,
    is_published: true,
  },
  {
    id: "placeholder-5",
    question: "How long does a typical project take?",
    answer:
      "It depends on the scope, but most initial automation builds are delivered within 2–6 weeks. The preview plan and scoping call help us give you a realistic timeline before you commit to anything.",
    sort_order: 5,
    is_published: true,
  },
  {
    id: "placeholder-6",
    question: "Can I try the demo without booking a call?",
    answer:
      "Absolutely. Head to the homepage and use the interactive demo to describe your workflow. You'll get a preview plan generated on the spot — no call required. If you like what you see, you can book a scoping call from there.",
    sort_order: 6,
    is_published: true,
  },
];

export default async function FAQPage() {
  /* Pull published FAQs from Firestore; fall back to placeholders when empty */
  let faqs: FAQ[];
  try {
    const published = await getPublishedFAQs();
    faqs = published.length > 0 ? published : placeholderFAQs;
  } catch {
    faqs = placeholderFAQs;
  }

  return (
    <section className="overflow-hidden border-b border-[#d8d1c4] bg-[#f4efe5] py-18 md:py-24">
      <div className="mx-auto max-w-4xl px-6">
        {/* Hero header — matches the aesthetic of /privacy and /terms */}
        <div className="relative overflow-hidden rounded-[40px] border border-[#d7d0c1] bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.72),rgba(255,255,255,0)_40%),linear-gradient(180deg,#f8f4ea_0%,#ede4d5_100%)] px-6 py-10 shadow-[0_28px_90px_rgba(70,58,40,0.10)] md:px-10 md:py-14">
          <div className="absolute -right-16 top-8 h-44 w-44 rounded-full bg-[radial-gradient(circle,rgba(130,154,90,0.20),rgba(130,154,90,0))]" />
          <div className="absolute -left-10 bottom-0 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.55),rgba(255,255,255,0))]" />

          <div className="relative">
            <p className="text-[11px] uppercase tracking-[0.32em] text-[#7f7c70]">
              Frequently Asked Questions
            </p>
            <h1 className="mt-4 max-w-2xl font-[var(--font-editorial)] text-5xl leading-[0.94] tracking-[-0.05em] text-[#1d2318] md:text-7xl">
              Got questions? We&apos;ve got answers.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-[#50584b]">
              Everything you need to know about preview plans, pricing, data
              handling, and working with Nicer Systems.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/contact"
                className="inline-flex rounded-full bg-[#171d13] px-5 py-3 text-sm font-semibold text-[#f7f2e8] transition-transform hover:scale-[1.02]"
              >
                Still have questions? Contact us
              </Link>
              <Link
                href="/#see-it-work"
                className="inline-flex rounded-full border border-[#d0c8b8] bg-[#fbf7ef] px-5 py-3 text-sm font-semibold text-[#27311f] transition-colors hover:bg-white"
              >
                Try the Demo
              </Link>
            </div>
          </div>
        </div>

        {/* FAQ accordion — reuses the existing FAQSection component */}
        <div className="mt-10">
          <FAQSection
            eyebrow=""
            title=""
            description=""
            faqsData={faqs}
          />
        </div>
      </div>
    </section>
  );
}
