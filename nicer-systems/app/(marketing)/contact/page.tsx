"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { leadSchema, type LeadInput } from "@/lib/validation";
import { track, EVENTS } from "@/lib/analytics";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlowLine } from "@/components/ui/GlowLine";

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
    <section className="py-24">
      <div className="max-w-3xl mx-auto px-6">
        <div className="h-10 w-48 bg-surface rounded animate-pulse mb-4" />
        <div className="h-5 w-96 bg-surface rounded animate-pulse mb-12" />
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
    if (formData.bottleneck) payload.bottleneck = formData.bottleneck;
    if (formData.tools) payload.tools = formData.tools;
    if (formData.urgency) payload.urgency = formData.urgency;

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

      setStatus("success");
      track(EVENTS.LEAD_SUBMIT);
    } catch (err) {
      setStatus("error");
      setServerError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  if (status === "success") {
    return (
      <section className="py-24">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6 shadow-[var(--glow-md)] animate-[pulse-glow_3s_ease-in-out_infinite]">
            <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold mb-4 text-glow">Message Received</h1>
          <p className="text-muted text-lg leading-relaxed">
            We&apos;ll review your details and reach out within 24 hours with a scoped plan.
          </p>
        </div>
      </section>
    );
  }

  const inputClasses = "w-full px-4 py-2.5 rounded-lg bg-surface border border-border text-foreground placeholder:text-muted focus-glow transition-[border-color,box-shadow] duration-250";

  return (
    <section className="py-24">
      <div className="max-w-3xl mx-auto px-6">
        <h1 className="text-4xl font-bold mb-4 text-glow">Let&apos;s Talk</h1>
        <p className="text-muted mb-12 leading-relaxed">
          Book a 45-minute scoping call, or send us your details and we&apos;ll
          reach out within 24 hours.
        </p>

        <div className="grid md:grid-cols-2 gap-12">
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm mb-1.5 text-foreground">Name *</label>
              <input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                className={inputClasses}
                placeholder="Your name"
              />
              {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm mb-1.5 text-foreground">Email *</label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                className={inputClasses}
                placeholder="you@company.com"
              />
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
            </div>

            {/* Company */}
            <div>
              <label htmlFor="company" className="block text-sm mb-1.5 text-foreground">Company *</label>
              <input
                id="company"
                name="company"
                type="text"
                value={formData.company}
                onChange={handleChange}
                className={inputClasses}
                placeholder="Your company"
              />
              {errors.company && <p className="text-red-400 text-xs mt-1">{errors.company}</p>}
            </div>

            {/* Bottleneck */}
            <div>
              <label htmlFor="bottleneck" className="block text-sm mb-1.5 text-foreground">
                What&apos;s your biggest operational bottleneck?
              </label>
              <textarea
                id="bottleneck"
                name="bottleneck"
                rows={4}
                value={formData.bottleneck}
                onChange={handleChange}
                className={`${inputClasses} resize-none`}
                placeholder="Describe the pain point..."
              />
            </div>

            {/* Tools */}
            <div>
              <label htmlFor="tools" className="block text-sm mb-1.5 text-foreground">
                Current tools / software
              </label>
              <input
                id="tools"
                name="tools"
                type="text"
                value={formData.tools}
                onChange={handleChange}
                className={inputClasses}
                placeholder="e.g. Salesforce, Slack, Excel"
              />
            </div>

            {/* Urgency */}
            <div>
              <label htmlFor="urgency" className="block text-sm mb-1.5 text-foreground">Urgency</label>
              <select
                id="urgency"
                name="urgency"
                value={formData.urgency}
                onChange={handleChange}
                className={inputClasses}
              >
                <option value="">Select urgency</option>
                <option value="low">Low — exploring options</option>
                <option value="medium">Medium — planning this quarter</option>
                <option value="high">High — need it soon</option>
                <option value="urgent">Urgent — this is blocking us</option>
              </select>
            </div>

            {/* Server error */}
            {status === "error" && (
              <div className="p-3 rounded-lg bg-red-900/30 border border-red-500/40 text-red-300 text-sm">
                {serverError || "Something went wrong. Please try again."}
              </div>
            )}

            <button
              type="submit"
              disabled={status === "submitting"}
              className="w-full px-6 py-3 rounded-lg bg-primary text-background font-semibold hover:shadow-[var(--glow-md)] active:scale-[0.97] transition-all disabled:opacity-50 disabled:cursor-not-allowed focus-glow"
            >
              {status === "submitting" ? "Sending..." : "Send Message"}
            </button>
          </form>

          {/* Booking / What happens next */}
          <div>
            <h2 className="text-xl font-semibold mb-4">What happens next</h2>
            <ol className="space-y-3 text-sm text-muted">
              <li className="flex gap-3">
                <span className="text-primary font-bold text-glow">1.</span>
                We confirm one workflow to focus on
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-bold text-glow">2.</span>
                We confirm the output you need (e.g., &quot;ticket resolved&quot;)
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-bold text-glow">3.</span>
                We confirm the owner + tool stack
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-bold text-glow">4.</span>
                You get a scoped plan within 24 hours
              </li>
            </ol>

            <GlowLine className="my-8" />

            <GlassCard className="p-4 gradient-border gradient-border-active">
              <p className="text-sm font-medium mb-2">Prefer to book directly?</p>
              <a
                href="mailto:johnwilnicer@gmail.com?subject=Scoping%20Call%20Request"
                className="inline-block px-4 py-2 rounded-lg bg-primary text-background text-sm font-semibold hover:shadow-[var(--glow-md)] active:scale-[0.97] transition-all"
              >
                Schedule a Call
              </a>
            </GlassCard>
          </div>
        </div>
      </div>
    </section>
  );
}
