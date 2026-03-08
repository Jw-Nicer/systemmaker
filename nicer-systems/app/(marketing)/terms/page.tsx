import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service | Nicer Systems",
  description:
    "Terms governing the Nicer Systems website, preview-plan demo, and project engagements.",
};

const LAST_UPDATED = "March 8, 2026";
const CONTACT_EMAIL = "johnwilnicer@gmail.com";

const summaryCards = [
  {
    label: "Applies to",
    value: "Website use, contact forms, preview plans, and public plan links",
  },
  {
    label: "Important note",
    value: "AI-assisted preview plans are draft guidance, not guaranteed outcomes",
  },
  {
    label: "Commercial work",
    value: "Paid engagements may be governed by separate written terms",
  },
];

const termsSections = [
  {
    id: "scope",
    title: "1. Scope",
    paragraphs: [
      "These Terms of Service govern your use of the Nicer Systems website, contact forms, preview-plan experience, public plan links, and related content made available through this site.",
      "If you engage Nicer Systems for paid work, a separate proposal, statement of work, order form, invoice, or other written agreement may add to or replace parts of these terms for that engagement.",
    ],
  },
  {
    id: "using-the-site",
    title: "2. Using the site",
    paragraphs: [
      "You may use this site only for lawful business purposes. You agree not to misuse the site, interfere with normal operation, attempt unauthorized access, scrape protected areas, or submit false, misleading, or infringing content.",
      "You are responsible for the accuracy of the information you submit through forms, demo prompts, booking flows, or project intake materials.",
    ],
  },
  {
    id: "preview-plans",
    title: "3. Preview plans and AI-assisted output",
    paragraphs: [
      "The preview-plan and agent experiences are designed to help you understand possible workflow designs, metrics, automations, dashboards, and next steps. They are informational drafts, not guarantees of business outcomes or final implementation scope.",
      "AI-assisted output can be incomplete or inaccurate. You should review all recommendations, assumptions, and generated materials before relying on them for operational, legal, financial, or technical decisions.",
    ],
    bullets: [
      "A generated preview plan is not a binding proposal unless we later confirm scope in writing.",
      "Delivery timelines, pricing, integrations, and feature availability may change after discovery.",
      "You should not submit sensitive personal data, regulated data, trade secrets, or credentials into public or trial experiences unless we have expressly agreed to handle that information.",
    ],
  },
  {
    id: "submissions",
    title: "4. Leads, submissions, and communications",
    paragraphs: [
      "If you submit your name, email, company, workflow details, or similar information, you authorize Nicer Systems to use that information to respond to your request, qualify your inquiry, prepare a draft plan, follow up about services, and improve the sales process.",
      "You represent that you have the right to share any materials, process descriptions, or business information you send to us.",
    ],
  },
  {
    id: "privacy-and-data",
    title: "5. Privacy and data handling",
    paragraphs: [
      "Nicer Systems is built to collect limited business contact information and workflow context. This may include fields such as name, email, company, bottleneck description, tools in use, urgency, and attribution data like page path or campaign tags.",
      "Plan records may be stored as public or private depending on how a plan is configured. If a plan is marked public, anyone with the link may be able to view it. Please avoid sharing confidential information in any content that may become publicly accessible.",
      "Our handling of personal information is also described on the privacy page.",
    ],
  },
  {
    id: "intellectual-property",
    title: "6. Intellectual property",
    paragraphs: [
      "The site, branding, copy, design, software, and underlying materials provided by Nicer Systems remain the property of Nicer Systems or its licensors unless a separate written agreement states otherwise.",
      "You retain rights in the materials and information you submit, but you grant Nicer Systems a non-exclusive right to use them as needed to operate the site, provide the requested services, and prepare or deliver project-related materials.",
    ],
  },
  {
    id: "third-party-services",
    title: "7. Third-party services",
    paragraphs: [
      "This site and related services may rely on third-party providers for hosting, analytics, authentication, data storage, email delivery, scheduling, or AI functionality. Those services may have their own terms and privacy practices.",
      "Nicer Systems is not responsible for downtime, errors, or policy changes caused by third-party platforms outside our reasonable control.",
    ],
  },
  {
    id: "project-terms",
    title: "8. Project terms, fees, and changes",
    paragraphs: [
      "Any paid implementation, automation build, dashboard work, or support arrangement will be governed by the commercial terms we confirm in writing. Unless a written agreement says otherwise, quoted prices are estimates, schedules are targets, and scope may change based on discovery.",
      "Change requests, added integrations, expanded deliverables, or delayed client feedback may require timeline or fee adjustments.",
    ],
  },
  {
    id: "no-warranties",
    title: "9. No warranties",
    paragraphs: [
      "The site, preview plans, templates, and related materials are provided on an \"as is\" and \"as available\" basis. To the maximum extent allowed by law, Nicer Systems disclaims warranties of merchantability, fitness for a particular purpose, non-infringement, and uninterrupted availability.",
      "We do not warrant that the site will always be secure, error-free, or available, or that any recommendation will produce a particular business result.",
    ],
  },
  {
    id: "limitation-of-liability",
    title: "10. Limitation of liability",
    paragraphs: [
      "To the maximum extent allowed by law, Nicer Systems will not be liable for any indirect, incidental, special, consequential, exemplary, or punitive damages, or for any loss of profits, revenue, goodwill, data, or business opportunity arising from or related to your use of the site or reliance on generated materials.",
      "If liability cannot be excluded, Nicer Systems' total liability for claims arising from the site or these terms will be limited to the amount you paid directly to Nicer Systems for the specific service giving rise to the claim during the 3 months before the event, or one hundred U.S. dollars if no fee was paid.",
    ],
  },
  {
    id: "suspension-and-termination",
    title: "11. Suspension and termination",
    paragraphs: [
      "We may suspend or limit access to the site, public plan links, or interactive features if we believe misuse, abuse, security issues, legal risk, or service instability requires it.",
      "These terms remain effective for any provisions that by their nature should survive termination, including ownership, disclaimers, liability limits, and dispute-related provisions.",
    ],
  },
  {
    id: "changes-to-terms",
    title: "12. Changes to these terms",
    paragraphs: [
      "Nicer Systems may update these terms from time to time. The updated version will be posted on this page with a revised effective date. Continued use of the site after an update means you accept the revised terms.",
    ],
  },
];

function Section({
  id,
  title,
  paragraphs,
  bullets,
}: {
  id: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
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
        {paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
        {bullets ? (
          <ul className="space-y-3 pl-5 text-[#44503f]">
            {bullets.map((bullet) => (
              <li key={bullet} className="list-disc">
                {bullet}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}

export default function TermsPage() {
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
                Terms for using the site, preview plans, and public plan links.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-[#50584b]">
                These terms cover the Nicer Systems website, intake flows,
                agent-powered preview experiences, and related public materials.
                Separate written commercial terms may apply to paid work.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/contact"
                  className="inline-flex rounded-full bg-[#171d13] px-5 py-3 text-sm font-semibold text-[#f7f2e8] transition-transform hover:scale-[1.02]"
                >
                  Contact Us
                </Link>
                <Link
                  href="/privacy"
                  className="inline-flex rounded-full border border-[#d0c8b8] bg-[#fbf7ef] px-5 py-3 text-sm font-semibold text-[#27311f] transition-colors hover:bg-white"
                >
                  Privacy Policy
                </Link>
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
                    Acceptance
                  </dt>
                  <dd className="mt-1 text-sm leading-6 text-[#46523a]">
                    By using the site or submitting information through contact,
                    demo, or plan flows, you agree to these terms.
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.16em] text-[#7c8577]">
                    Questions
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
              {termsSections.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="block rounded-full border border-transparent px-3 py-2 text-sm text-[#495548] transition-colors hover:border-[#d4ccbc] hover:bg-white/60 hover:text-[#1d2318]"
                >
                  {section.title}
                </a>
              ))}
            </nav>
          </aside>

          <div className="space-y-6">
            {termsSections.map((section) => (
              <Section
                key={section.id}
                id={section.id}
                title={section.title}
                paragraphs={section.paragraphs}
                bullets={section.bullets}
              />
            ))}

            <section className="rounded-[32px] border border-[#d7d0c1] bg-[linear-gradient(180deg,#faf7ef,#f2ebde)] p-7 shadow-[0_20px_60px_rgba(70,58,40,0.08)] md:p-9">
              <p className="text-[11px] uppercase tracking-[0.2em] text-[#7e7b70]">
                Contact
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[#1d2318] md:text-[2rem]">
                Questions about these terms
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-[#556052] md:text-[15px]">
                Use the{" "}
                <Link
                  href="/contact"
                  className="font-medium text-[#27311f] underline underline-offset-4"
                >
                  contact page
                </Link>{" "}
                if you need clarification before submitting a request, sharing a
                workflow, or starting a project. For data-handling details,
                review the{" "}
                <Link
                  href="/privacy"
                  className="font-medium text-[#27311f] underline underline-offset-4"
                >
                  privacy policy
                </Link>
                .
              </p>
            </section>
          </div>
        </div>
      </div>
    </section>
  );
}
