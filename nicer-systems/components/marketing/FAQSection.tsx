import { getPublishedFAQs } from "@/lib/firestore/faqs";
import { FAQAccordion } from "./FAQAccordion";

const fallbackFAQs = [
  {
    id: "f1",
    question: "How long does it take to get started?",
    answer:
      "We start with a 45-minute scoping call. Within 24 hours, you'll have a clear plan. From there, most projects are fully installed within 30 days.",
    sort_order: 0,
    is_published: true,
  },
  {
    id: "f2",
    question: "What tools do you work with?",
    answer:
      "We're tool-agnostic. Whether you use Google Sheets, Airtable, Notion, Salesforce, or something else — we build on top of what you already have, adding dashboards, alerts, and automation where they matter most.",
    sort_order: 1,
    is_published: true,
  },
  {
    id: "f3",
    question: "Do I need to change my current workflow?",
    answer:
      "No. We map your existing workflow first, then layer visibility and automation on top. We don't rip and replace — we enhance what's already working.",
    sort_order: 2,
    is_published: true,
  },
  {
    id: "f4",
    question: "What's a Weekly Ops Pulse?",
    answer:
      "It's a concise weekly report that surfaces the key metrics, stuck items, and trends in your operations. Think of it as a heartbeat monitor for your business — delivered every Monday morning.",
    sort_order: 3,
    is_published: true,
  },
  {
    id: "f5",
    question: "What if I only have one workflow to fix?",
    answer:
      "That's exactly what the Starter plan is for. One workflow, mapped and automated, delivered in 30 days. Most clients start here and expand once they see the results.",
    sort_order: 4,
    is_published: true,
  },
];

export async function FAQSection() {
  let faqs = await getPublishedFAQs();

  if (faqs.length === 0) {
    faqs = fallbackFAQs;
  }

  return (
    <section className="py-24 bg-surface">
      <div className="max-w-3xl mx-auto px-6">
        <h2 className="text-3xl font-bold text-center mb-4">
          Frequently Asked Questions
        </h2>
        <p className="text-muted text-center mb-12">
          Everything you need to know before we start.
        </p>
        <FAQAccordion faqs={faqs} />
      </div>
    </section>
  );
}
