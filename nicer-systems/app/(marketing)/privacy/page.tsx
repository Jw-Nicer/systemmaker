import type { Metadata } from "next";
import Link from "next/link";
import { PrivacyPreferencesButton } from "@/components/ui/AnalyticsConsentControls";

const LAST_UPDATED = "March 8, 2026";
const CONTACT_EMAIL = "johnwilnicer@gmail.com";

const summaryCards = [
  {
    label: "What we collect",
    value: "Contact details, workflow context, and product usage events",
  },
  {
    label: "Primary use",
    value:
      "Responding to inquiries, generating preview plans, emailing follow-ups, and improving the site",
  },
  {
    label: "Where it goes",
    value:
      "Internal admin systems plus service providers for hosting, AI, email, and analytics",
  },
];

const dataCategories = [
  {
    title: "Contact and company details",
    body:
      "When you use the contact form or request an emailed preview plan, we may collect your name, email address, company name, and the details you provide about your workflow.",
  },
  {
    title: "Operational context you submit",
    body:
      "When you use the preview-plan experience, we may collect the industry, bottleneck description, current tools, urgency, and volume information you enter so we can generate and send the plan.",
  },
  {
    title: "Attribution and experiment context",
    body:
      "We store landing path, UTM parameters, and active experiment assignments to understand which pages and messages are driving useful inquiries.",
  },
  {
    title: "Interaction analytics",
    body:
      "We log product and marketing events such as landing views, booking clicks, preview-plan actions, and lead submissions. In production, analytics tooling may also process those events if enabled. You can change analytics tracking from the Privacy Preferences control in the footer.",
  },
  {
    title: "Plan sharing and email delivery",
    body:
      "If you request an emailed preview plan, we process your name, email address, and plan content so the plan can be delivered. Shared plan links may also store view counts and public visibility settings.",
  },
];

const useCases = [
  "Reply to inquiries and schedule scoping calls.",
  "Generate, deliver, and improve preview plans.",
  "Email preview plans and follow-up sequences related to your inquiry.",
  "Score and manage leads inside the admin workspace.",
  "Measure which pages, experiments, and calls to action are performing.",
  "Protect the site through basic rate limiting and anti-spam checks.",
];

const sharingRules = [
  "We do not sell personal information.",
  "Lead records and submitted workflow details are stored for internal business use.",
  "Authorized service providers may process data when required to run the product, including hosting, database infrastructure, AI generation, email delivery, authentication, and analytics.",
  "Information may be disclosed when reasonably necessary to comply with law, enforce our terms, or protect the service.",
];

const providers = [
  {
    name: "Firebase",
    purpose:
      "Hosting, authentication, database storage, and file infrastructure used to run the site and admin workspace.",
  },
  {
    name: "Google Gemini",
    purpose:
      "AI generation used to create and refine preview-plan content from the workflow details you submit.",
  },
  {
    name: "Resend",
    purpose:
      "Email delivery for preview plans, admin notifications, and follow-up communication.",
  },
  {
    name: "PostHog",
    purpose:
      "Product and marketing analytics when analytics is enabled in production.",
  },
];

const retentionNotes = [
  "Inquiry records, lead details, and related workflow notes may be retained for as long as reasonably necessary to respond to your request, operate the business, maintain records, and improve the service.",
  "Analytics and event records may be retained for product measurement, troubleshooting, and abuse prevention.",
  "Preview plans may be stored with public sharing enabled. Anyone with a public plan link may be able to access that plan until it is removed or access is changed.",
];

const rights = [
  "Ask what personal information we hold about you.",
  "Request correction or deletion of your information, subject to legal and operational requirements.",
  "Request that we stop using your information for future outreach.",
  "Ask us not to email you additional follow-up messages about your inquiry.",
];

export const metadata: Metadata = {
  title: "Privacy Policy | Nicer Systems",
  description:
    "How Nicer Systems collects, uses, stores, and protects personal information across contact forms, preview plans, and marketing analytics.",
};

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="rounded-[32px] border border-[#d7d0c1] bg-[linear-gradient(180deg,rgba(251,247,239,0.96),rgba(241,233,219,0.98))] p-7 shadow-[0_20px_60px_rgba(70,58,40,0.08)] md:p-9"
    >
      <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[#1d2318] md:text-[2rem]">
        {title}
      </h2>
      <div className="mt-4 space-y-4 text-sm leading-7 text-[#4f594b] md:text-[15px]">
        {children}
      </div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <section className="overflow-hidden border-b border-[#d8d1c4] bg-[#f4efe5] py-18 md:py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="relative overflow-hidden rounded-[40px] border border-[#d7d0c1] bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.72),rgba(255,255,255,0)_40%),linear-gradient(180deg,#f8f4ea_0%,#ede4d5_100%)] px-6 py-10 shadow-[0_28px_90px_rgba(70,58,40,0.10)] md:px-10 md:py-12">
          <div className="absolute -right-16 top-8 h-44 w-44 rounded-full bg-[radial-gradient(circle,rgba(130,154,90,0.20),rgba(130,154,90,0))]" />
          <div className="absolute -left-10 bottom-0 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.55),rgba(255,255,255,0))]" />

          <div className="relative grid gap-10 lg:grid-cols-[1.25fr_0.7fr]">
            <div>
              <p className="text-[11px] uppercase tracking-[0.32em] text-[#7f7c70]">
                Legal
              </p>
              <h1 className="mt-4 max-w-3xl font-[var(--font-editorial)] text-5xl leading-[0.94] tracking-[-0.05em] text-[#1d2318] md:text-7xl">
                Privacy policy for inquiries, preview plans, and site analytics.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-[#50584b]">
                This page explains what Nicer Systems collects, why we collect
                it, how it is used, and how to contact us if you want your
                information reviewed, corrected, or deleted.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/contact"
                  className="inline-flex rounded-full bg-[#171d13] px-5 py-3 text-sm font-semibold text-[#f7f2e8] transition-transform hover:scale-[1.02]"
                >
                  Contact Us
                </Link>
                <Link
                  href="/terms"
                  className="inline-flex rounded-full border border-[#d0c8b8] bg-[#fbf7ef] px-5 py-3 text-sm font-semibold text-[#27311f] transition-colors hover:bg-white"
                >
                  Terms of Service
                </Link>
                <PrivacyPreferencesButton className="inline-flex rounded-full border border-[#d0c8b8] bg-white/70 px-5 py-3 text-sm font-semibold text-[#27311f] transition-colors hover:bg-white">
                  Manage Privacy Preferences
                </PrivacyPreferencesButton>
              </div>
            </div>

            <div className="relative rounded-[30px] border border-[#d6cfbf] bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(244,238,228,0.95))] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]">
              <p className="text-[11px] uppercase tracking-[0.22em] text-[#7e7b70]">
                Quick facts
              </p>
              <dl className="mt-5 space-y-5">
                <div>
                  <dt className="text-xs uppercase tracking-[0.16em] text-[#7c8577]">
                    Last updated
                  </dt>
                  <dd className="mt-1 text-lg font-semibold text-[#1d2318]">
                    {LAST_UPDATED}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.16em] text-[#7c8577]">
                    Contact
                  </dt>
                  <dd className="mt-1 text-sm text-[#46523a]">
                    <a
                      href={`mailto:${CONTACT_EMAIL}`}
                      className="underline decoration-[#93a071] underline-offset-4"
                    >
                      {CONTACT_EMAIL}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.16em] text-[#7c8577]">
                    Internal access
                  </dt>
                  <dd className="mt-1 text-sm leading-6 text-[#46523a]">
                    Lead data is restricted to authenticated admin access inside
                    the Nicer Systems workspace.
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {summaryCards.map((card) => (
            <div
              key={card.label}
              className="rounded-[26px] border border-[#d8d1c4] bg-[linear-gradient(180deg,rgba(251,247,239,0.96),rgba(240,232,218,0.92))] p-6 shadow-[0_16px_40px_rgba(70,58,40,0.06)]"
            >
              <p className="text-[11px] uppercase tracking-[0.18em] text-[#7d7a6f]">
                {card.label}
              </p>
              <p className="mt-3 text-sm leading-6 text-[#445144]">
                {card.value}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[0.72fr_1.28fr]">
          <aside className="h-fit rounded-[30px] border border-[#d7d0c1] bg-[linear-gradient(180deg,#f8f4ea,#efe6d8)] p-6 shadow-[0_18px_50px_rgba(70,58,40,0.06)] lg:sticky lg:top-24">
            <p className="text-[11px] uppercase tracking-[0.22em] text-[#7e7b70]">
              On this page
            </p>
            <nav className="mt-4 space-y-3">
              {[
                ["information-we-collect", "Information we collect"],
                ["how-we-use-data", "How we use data"],
                ["sharing-and-access", "Sharing and access"],
                ["service-providers", "Service providers"],
                ["storage-and-security", "Storage and security"],
                ["retention-and-public-links", "Retention and public links"],
                ["your-choices", "Your choices"],
                ["contact-us", "Contact us"],
              ].map(([href, label]) => (
                <a
                  key={href}
                  href={`#${href}`}
                  className="block rounded-full border border-transparent px-3 py-2 text-sm text-[#495548] transition-colors hover:border-[#d4ccbc] hover:bg-white/60 hover:text-[#1d2318]"
                >
                  {label}
                </a>
              ))}
            </nav>
          </aside>

          <div className="space-y-6">
            <Section id="information-we-collect" title="Information we collect">
              <p>
                We collect information you choose to submit and limited
                technical context tied to how you interact with the site.
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                {dataCategories.map((item) => (
                  <div
                    key={item.title}
                    className="rounded-[24px] border border-[#ddd5c7] bg-white/55 p-5"
                  >
                    <h3 className="text-base font-semibold text-[#1d2318]">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-[#556052]">
                      {item.body}
                    </p>
                  </div>
                ))}
              </div>
            </Section>

            <Section id="how-we-use-data" title="How we use data">
              <ul className="space-y-3">
                {useCases.map((item) => (
                  <li
                    key={item}
                    className="rounded-[22px] border border-[#ddd5c7] bg-white/52 px-4 py-3 text-sm leading-6 text-[#4f594b]"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </Section>

            <Section id="sharing-and-access" title="Sharing and access">
              <ul className="space-y-3">
                {sharingRules.map((item) => (
                  <li
                    key={item}
                    className="rounded-[22px] border border-[#ddd5c7] bg-white/52 px-4 py-3 text-sm leading-6 text-[#4f594b]"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </Section>

            <Section id="service-providers" title="Service providers">
              <p>
                We use third-party providers to run core parts of the product.
                Those providers may process information on our behalf so the
                service works as expected.
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                {providers.map((provider) => (
                  <div
                    key={provider.name}
                    className="rounded-[24px] border border-[#ddd5c7] bg-white/55 p-5"
                  >
                    <h3 className="text-base font-semibold text-[#1d2318]">
                      {provider.name}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-[#556052]">
                      {provider.purpose}
                    </p>
                  </div>
                ))}
              </div>
            </Section>

            <Section id="storage-and-security" title="Storage and security">
              <p>
                Submitted lead information and related operational notes are
                stored in our backend systems so the team can review and manage
                inquiries. Access to admin views requires authentication, and
                API requests are validated and rate limited.
              </p>
              <p>
                We also log site and product events to support analytics,
                troubleshooting, and funnel measurement. Shared plans can be
                configured for public access, so you should avoid including
                confidential information in content that may be shared by link.
              </p>
              <p>
                No internet-facing system is perfectly secure, so we cannot
                guarantee absolute security. If you believe data has been
                handled improperly, email us at{" "}
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="underline decoration-[#93a071] underline-offset-4"
                >
                  {CONTACT_EMAIL}
                </a>
                .
              </p>
            </Section>

            <Section
              id="retention-and-public-links"
              title="Retention and public links"
            >
              <ul className="space-y-3">
                {retentionNotes.map((item) => (
                  <li
                    key={item}
                    className="rounded-[22px] border border-[#ddd5c7] bg-white/52 px-4 py-3 text-sm leading-6 text-[#4f594b]"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </Section>

            <Section id="your-choices" title="Your choices">
              <p>
                Depending on your location and the nature of your request, you
                may be able to:
              </p>
              <ul className="space-y-3">
                {rights.map((item) => (
                  <li
                    key={item}
                    className="rounded-[22px] border border-[#ddd5c7] bg-white/52 px-4 py-3 text-sm leading-6 text-[#4f594b]"
                  >
                    {item}
                  </li>
                ))}
              </ul>
              <p>
                To make a request, email{" "}
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="underline decoration-[#93a071] underline-offset-4"
                >
                  {CONTACT_EMAIL}
                </a>
                .
              </p>
              <p>
                You can also reopen the analytics banner at any time from the
                footer&apos;s Privacy Preferences control.
              </p>
            </Section>

            <Section id="contact-us" title="Contact us">
              <p>
                Questions about this policy, submitted lead information, or how
                preview-plan data is handled can be sent to{" "}
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="underline decoration-[#93a071] underline-offset-4"
                >
                  {CONTACT_EMAIL}
                </a>
                .
              </p>
              <p>
                If this policy changes materially, we will update the date at
                the top of this page.
              </p>
            </Section>
          </div>
        </div>
      </div>
    </section>
  );
}
