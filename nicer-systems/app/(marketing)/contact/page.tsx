"use client";

import Link from "next/link";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { leadSchema, type LeadInput } from "@/lib/validation";
import { track, EVENTS } from "@/lib/analytics";
import { getCurrentExperimentAssignments } from "@/lib/experiments/assignments";
import { PrivacyPreferencesButton } from "@/components/ui/AnalyticsConsentControls";

type FormErrors = Partial<Record<keyof LeadInput, string>>;

export default function ContactPage() {
  return (
    <Suspense fallback={<ContactFormSkeleton />}>
      <ContactForm />
    </Suspense>
  );
}

function ContactFormSkeleton() {
  return (
    <section className="border-b border-[#d8d1c4] bg-[#f4efe5] py-24">
      <div className="mx-auto max-w-5xl px-6">
        <div className="h-3 w-28 rounded-full bg-[#e2dbc9] animate-pulse" />
        <div className="mt-5 h-16 w-full max-w-2xl rounded-[28px] bg-[#ebe4d6] animate-pulse" />
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <div className="h-48 rounded-[28px] bg-[#ece4d6] animate-pulse" />
          <div className="h-48 rounded-[28px] bg-[#ece4d6] animate-pulse" />
        </div>
      </div>
    </section>
  );
}

function ContactForm() {
  const searchParams = useSearchParams();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    bottleneck: "",
    tools: "",
    urgency: "" as "" | LeadInput["urgency"],
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [serverError, setServerError] = useState("");
  const [utmParams, setUtmParams] = useState<Record<string, string>>({});

  useEffect(() => {
    const utm: Record<string, string> = {};
    for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content"] as const) {
      const val = searchParams.get(key);
      if (val) utm[key] = val;
    }
    utm.landing_path = window.location.pathname;
    setUtmParams(utm);
  }, [searchParams]);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError("");

    const payload: Record<string, unknown> = {
      name: formData.name,
      email: formData.email,
      company: formData.company,
      ...utmParams,
    };
    const experimentAssignments = getCurrentExperimentAssignments();
    if (formData.bottleneck) payload.bottleneck = formData.bottleneck;
    if (formData.tools) payload.tools = formData.tools;
    if (formData.urgency) payload.urgency = formData.urgency;
    if (experimentAssignments.length > 0) {
      payload.experiment_assignments = experimentAssignments;
    }

    const result = leadSchema.safeParse(payload);
    if (!result.success) {
      const fieldErrors: FormErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof LeadInput;
        if (!fieldErrors[field]) fieldErrors[field] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setStatus("submitting");
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result.data),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Something went wrong");
      }

      const body = await res.json().catch(() => null);
      setStatus("success");
      track(EVENTS.LEAD_SUBMIT, { lead_id: body?.lead_id });
    } catch (err) {
      setStatus("error");
      setServerError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  if (status === "success") {
    return (
      <section className="border-b border-[#d8d1c4] bg-[#f4efe5] py-24">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full border border-[#ccd4bf] bg-[#e8eedf] shadow-[0_12px_32px_rgba(77,93,44,0.10)]">
            <svg className="h-8 w-8 text-[#4f6328]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="mt-8 text-[11px] uppercase tracking-[0.3em] text-[#7f7c70]">
            Request received
          </p>
          <h1 className="mt-4 font-[var(--font-editorial)] text-5xl leading-[0.96] tracking-[-0.04em] text-[#1d2318] md:text-6xl">
            We&apos;ll follow up with the right next step.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-[#50584b]">
            We&apos;ll review the workflow details and reply within one business day.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a
              href={process.env.NEXT_PUBLIC_BOOKING_URL || "mailto:johnwilnicer@gmail.com?subject=Scoping%20Call%20Request"}
              {...(process.env.NEXT_PUBLIC_BOOKING_URL ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              onClick={() => track(EVENTS.BOOKING_CLICK)}
              className="inline-flex items-center gap-2 rounded-full bg-[#171d13] px-5 py-3 text-sm font-semibold text-[#f7f2e8] transition-transform hover:scale-[1.02]"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              Schedule a 45-minute call
            </a>
            <Link
              href="/#see-it-work"
              onClick={() => track(EVENTS.CTA_CLICK_PREVIEW_PLAN)}
              className="inline-flex rounded-full border border-[#d0c8b8] bg-[#fbf7ef] px-5 py-3 text-sm font-semibold text-[#27311f] transition-colors hover:bg-white"
            >
              Get a Preview Plan
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const inputClasses =
    "w-full rounded-[18px] border border-[#d5cdbd] bg-[#fbf7ef] px-4 py-3 text-sm text-[#25311f] placeholder:text-[#76806e] focus-organic transition-[border-color,box-shadow] duration-250";

  return (
    <section className="border-b border-[#d8d1c4] bg-[#f4efe5] py-20 md:py-24">
      <div className="mx-auto max-w-5xl px-6">
        <div className="max-w-3xl">
          <p className="text-[11px] uppercase tracking-[0.32em] text-[#7f7c70]">
            Scoping Call
          </p>
          <h1 className="mt-4 font-[var(--font-editorial)] text-5xl leading-[0.96] tracking-[-0.05em] text-[#1d2318] md:text-7xl">
            Choose the next step.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-[#50584b]">
            Book the call if you want to scope the workflow together. Start with a preview plan if you want to see the output first.
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <div className="rounded-[30px] border border-[#d7d0c1] bg-[linear-gradient(180deg,#faf7ef,#f0e8db)] p-7 shadow-[0_18px_56px_rgba(70,58,40,0.08)]">
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#7e7b70]">
              Option 1
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[#1d2318]">
              Book a Scoping Call
            </h2>
            <p className="mt-3 text-sm leading-6 text-[#556052]">
              Best if you already know the workflow and want to decide the next move fast.
            </p>
            <div className="mt-5 space-y-2 text-sm text-[#50584b]">
              <p>45 minutes</p>
              <p>One workflow</p>
              <p>Clear next step</p>
            </div>
            <a
              href={process.env.NEXT_PUBLIC_BOOKING_URL || "mailto:johnwilnicer@gmail.com?subject=Scoping%20Call%20Request"}
              {...(process.env.NEXT_PUBLIC_BOOKING_URL ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              onClick={() => track(EVENTS.BOOKING_CLICK)}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#171d13] px-5 py-3 text-sm font-semibold text-[#f7f2e8] transition-transform hover:scale-[1.02]"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              Schedule a 45-minute call
            </a>
          </div>

          <div className="rounded-[30px] border border-[#d7d0c1] bg-[linear-gradient(180deg,#faf7ef,#f0e8db)] p-7 shadow-[0_18px_56px_rgba(70,58,40,0.08)]">
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#7e7b70]">
              Option 2
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[#1d2318]">
              Run a Guided Audit first
            </h2>
            <p className="mt-3 text-sm leading-6 text-[#556052]">
              Best if you want to structure the workflow problem before you review the draft plan.
            </p>
            <div className="mt-5 space-y-2 text-sm text-[#50584b]">
              <p>Map the breakpoints</p>
              <p>Generate the draft output</p>
              <p>Come to the call sharper</p>
            </div>
            <Link
              href="/audit"
              onClick={() => track(EVENTS.CTA_CLICK_PREVIEW_PLAN)}
              className="mt-6 inline-flex rounded-full border border-[#d0c8b8] bg-[#fbf7ef] px-5 py-3 text-sm font-semibold text-[#27311f] transition-colors hover:bg-white"
            >
              Run the Guided Audit
            </Link>
          </div>
        </div>

        <div className="mt-8 rounded-[30px] border border-[#d7d0c1] bg-[linear-gradient(180deg,#f8f4ea,#eee6d8)] p-7 shadow-[0_18px_56px_rgba(70,58,40,0.08)]">
          <div className="max-w-2xl">
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#7e7b70]">
              Prefer email first?
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[#1d2318]">
              Send the basics and we&apos;ll guide you.
            </h2>
            <p className="mt-3 text-sm leading-6 text-[#556052]">
              The required fields are all we need. Add the bottleneck if you want us to review context before we reply.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-[#24311f]">Name *</label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  className={inputClasses}
                  placeholder="Your name"
                />
                {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
              </div>

              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-[#24311f]">Email *</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={inputClasses}
                  placeholder="you@company.com"
                />
                {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-[1fr_0.9fr]">
              <div>
                <label htmlFor="company" className="mb-1.5 block text-sm font-medium text-[#24311f]">Company *</label>
                <input
                  id="company"
                  name="company"
                  type="text"
                  value={formData.company}
                  onChange={handleChange}
                  className={inputClasses}
                  placeholder="Your company"
                />
                {errors.company && <p className="mt-1 text-xs text-red-500">{errors.company}</p>}
              </div>

              <div>
                <label htmlFor="urgency" className="mb-1.5 block text-sm font-medium text-[#24311f]">Urgency</label>
                <select
                  id="urgency"
                  name="urgency"
                  value={formData.urgency}
                  onChange={handleChange}
                  className={inputClasses}
                >
                  <option value="">Select urgency</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
              <div>
                <label htmlFor="bottleneck" className="mb-1.5 block text-sm font-medium text-[#24311f]">
                  Bottleneck
                </label>
                <textarea
                  id="bottleneck"
                  name="bottleneck"
                  rows={4}
                  value={formData.bottleneck}
                  onChange={handleChange}
                  className={`${inputClasses} resize-none`}
                  placeholder="Describe the workflow issue."
                />
              </div>

              <div>
                <label htmlFor="tools" className="mb-1.5 block text-sm font-medium text-[#24311f]">
                  Current tools
                </label>
                <input
                  id="tools"
                  name="tools"
                  type="text"
                  value={formData.tools}
                  onChange={handleChange}
                  className={inputClasses}
                  placeholder="Slack, Airtable, HubSpot"
                />
              </div>
            </div>

            {status === "error" && (
              <div className="rounded-[18px] border border-[#dc8f8f] bg-[#fff2f2] p-3 text-sm text-[#9d3f3f]">
                {serverError || "Something went wrong. Please try again."}
              </div>
            )}

            <div className="flex flex-col gap-3 border-t border-[#ddd5c6] pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm leading-6 text-[#596351]">
                  We&apos;ll reply within one business day.
                </p>
                <p className="mt-1 text-xs leading-5 text-[#6d7567]">
                  By sending details, you agree we may use this information to
                  respond to your request. See our{" "}
                  <Link
                    href="/privacy"
                    className="text-[#2d4a2a] underline decoration-[#93a071] underline-offset-4"
                  >
                    Privacy Policy
                  </Link>{" "}
                  and{" "}
                  <Link
                    href="/terms"
                    className="text-[#2d4a2a] underline decoration-[#93a071] underline-offset-4"
                  >
                    Terms
                  </Link>
                  .
                </p>
                <PrivacyPreferencesButton className="mt-2 text-xs font-medium text-[#2d4a2a] underline decoration-[#93a071] underline-offset-4">
                  Manage Privacy Preferences
                </PrivacyPreferencesButton>
              </div>
              <button
                type="submit"
                disabled={status === "submitting"}
                className="inline-flex rounded-full bg-[#171d13] px-6 py-3 text-sm font-semibold text-[#f7f2e8] transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50 focus-organic"
              >
                {status === "submitting" ? "Sending..." : "Send details"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
