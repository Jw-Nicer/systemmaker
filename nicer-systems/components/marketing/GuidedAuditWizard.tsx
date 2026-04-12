"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AgentDemoResults } from "@/components/marketing/AgentDemoResults";
import { PlanBuildProgress } from "@/components/marketing/PlanBuildProgress";
import { track, EVENTS } from "@/lib/analytics";
import { guidedAuditSchema, type GuidedAuditInput } from "@/lib/validation";
import { getCurrentExperimentAssignments } from "@/lib/experiments/assignments";
import type { PreviewPlan } from "@/types/preview-plan";
import {
  AUDIT_INDUSTRIES,
  AUDIT_STACK_MATURITY,
  AUDIT_TEAM_SIZES,
  AUDIT_TIME_LOST,
  AUDIT_WORKFLOW_TYPES,
} from "@/types/audit";

const TOOL_OPTIONS = [
  "Excel",
  "Google Sheets",
  "Email",
  "Slack",
  "QuickBooks",
  "Airtable",
  "HubSpot",
  "ServiceTitan",
  "Jobber",
  "Custom software",
] as const;

type FieldErrors = Partial<Record<keyof GuidedAuditInput, string>>;

const INITIAL_FORM: GuidedAuditInput = {
  industry: "" as GuidedAuditInput["industry"],
  workflow_type: "Intake & Onboarding",
  bottleneck: "",
  current_tools: [],
  urgency: undefined,
  volume: "",
  team_size: "1-5",
  stack_maturity: "Spreadsheets only",
  manual_steps: "",
  handoff_breaks: "",
  visibility_gap: "",
  desired_outcome: "",
  time_lost_per_week: undefined,
  compliance_notes: "",
};

const STEP_FIELDS: (keyof GuidedAuditInput)[][] = [
  ["industry", "workflow_type", "team_size", "stack_maturity"],
  ["bottleneck", "manual_steps", "handoff_breaks", "visibility_gap"],
  ["current_tools", "volume", "urgency", "time_lost_per_week", "compliance_notes"],
  ["desired_outcome"],
];

const STEP_COPY = [
  {
    eyebrow: "Step 1",
    title: "Context",
    description: "Define the workflow and how mature the current setup is.",
  },
  {
    eyebrow: "Step 2",
    title: "Breakpoints",
    description: "Capture where the work slows down, breaks, or disappears.",
  },
  {
    eyebrow: "Step 3",
    title: "Operating load",
    description: "Show the stack, volume, and risk level around the workflow.",
  },
  {
    eyebrow: "Step 4",
    title: "Target state",
    description: "State the outcome you want the system to deliver.",
  },
] as const;

export function GuidedAuditWizard() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<GuidedAuditInput>(INITIAL_FORM);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [completedSections, setCompletedSections] = useState<Set<string>>(new Set());
  const [serverError, setServerError] = useState("");
  const [result, setResult] = useState<{
    plan: PreviewPlan;
    leadId: string;
    planId: string;
    shareUrl: string;
  } | null>(null);

  useEffect(() => {
    track(EVENTS.GUIDED_AUDIT_START);
  }, []);

  function setField<K extends keyof GuidedAuditInput>(key: K, value: GuidedAuditInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function toggleTool(tool: string) {
    const hasTool = form.current_tools.includes(tool);
    setField(
      "current_tools",
      hasTool
        ? form.current_tools.filter((item) => item !== tool)
        : [...form.current_tools, tool]
    );
  }

  function getStepErrors(targetStep: number) {
    const payload = sanitizeForm(form);
    const parsed = guidedAuditSchema.safeParse(payload);
    if (parsed.success) {
      return {};
    }

    const relevantFields = new Set(STEP_FIELDS[targetStep]);
    const nextErrors: FieldErrors = {};

    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as keyof GuidedAuditInput;
      if (relevantFields.has(field) && !nextErrors[field]) {
        nextErrors[field] = issue.message;
      }
    }

    return nextErrors;
  }

  function handleNext() {
    const stepErrors = getStepErrors(step);
    if (Object.keys(stepErrors).length > 0) {
      setErrors((prev) => ({ ...prev, ...stepErrors }));
      return;
    }

    setStep((current) => Math.min(current + 1, STEP_COPY.length - 1));
  }

  async function handleSubmit() {
    const parsed = guidedAuditSchema.safeParse({
      ...sanitizeForm(form),
      landing_path: window.location.pathname,
      experiment_assignments: getCurrentExperimentAssignments(),
    });

    if (!parsed.success) {
      const nextErrors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as keyof GuidedAuditInput;
        if (!nextErrors[field]) {
          nextErrors[field] = issue.message;
        }
      }
      setErrors(nextErrors);
      return;
    }

    setStatus("submitting");
    setServerError("");
    setCompletedSections(new Set());

    try {
      const response = await fetch("/api/agent/audit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify(parsed.data),
      });

      // SSE streaming path (2B)
      if (response.headers.get("content-type")?.includes("text/event-stream")) {
        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let currentEvent = "";
        let buffer = "";
        let planData: Record<string, unknown> = {};
        let planCompleteData: { lead_id?: string; plan_id?: string; share_url?: string } = {};

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (line.startsWith("event: ")) {
              currentEvent = line.slice(7).trim();
            } else if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (currentEvent === "plan_section" && data.content) {
                  const section = data.section as string;
                  const planKey = section === "implementation_sequencer" ? "roadmap"
                    : section === "proposal_writer" ? "proposal"
                    : section;
                  planData[planKey] = JSON.parse(data.content);
                  setCompletedSections((prev) => new Set([...prev, section]));
                } else if (currentEvent === "plan_complete") {
                  planCompleteData = data;
                }
              } catch {
                // skip malformed
              }
            }
          }
        }

        if (planCompleteData.plan_id) {
          setResult({
            plan: planData as unknown as PreviewPlan,
            leadId: planCompleteData.lead_id ?? "",
            planId: planCompleteData.plan_id,
            shareUrl: planCompleteData.share_url ?? "",
          });
          setStatus("idle");
          track(EVENTS.GUIDED_AUDIT_COMPLETE, {
            lead_id: planCompleteData.lead_id,
            plan_id: planCompleteData.plan_id,
          });
        } else {
          throw new Error("Plan generation incomplete");
        }
      } else {
        // JSON fallback path
        const body = await response.json().catch(() => null);
        if (!response.ok || !body?.preview_plan) {
          throw new Error(body?.error || "Failed to generate audit");
        }
        setResult({
          plan: body.preview_plan,
          leadId: body.lead_id,
          planId: body.plan_id,
          shareUrl: body.share_url,
        });
        setStatus("idle");
        track(EVENTS.GUIDED_AUDIT_COMPLETE, {
          lead_id: body.lead_id,
          plan_id: body.plan_id,
        });
      }
    } catch (error) {
      setStatus("error");
      setServerError(
        error instanceof Error ? error.message : "Failed to generate audit"
      );
    }
  }

  function resetWizard() {
    setResult(null);
    setStatus("idle");
    setServerError("");
    setErrors({});
    setStep(0);
    setForm(INITIAL_FORM);
  }

  if (result) {
    return (
      <div className="space-y-6">
        <div className="rounded-[28px] border border-[#d7d0c1] bg-[linear-gradient(180deg,#faf7ef,#f0e8db)] p-6 shadow-[0_18px_56px_rgba(70,58,40,0.08)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-[#7f7c70]">
                Guided audit complete
              </p>
              <h2 className="mt-3 font-[var(--font-editorial)] text-4xl leading-[0.96] tracking-[-0.04em] text-[#1d2318]">
                Your workflow audit is ready.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#556052]">
                Review the draft plan below, share it, or send it to your inbox.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href={result.shareUrl}
                className="inline-flex rounded-full border border-[#d0c8b8] bg-[#fbf7ef] px-5 py-3 text-sm font-semibold text-[#27311f] transition-colors hover:bg-white"
              >
                Open shareable plan
              </Link>
              <button
                type="button"
                onClick={resetWizard}
                className="inline-flex rounded-full bg-[#171d13] px-5 py-3 text-sm font-semibold text-[#f7f2e8] transition-transform hover:scale-[1.02]"
              >
                Run another audit
              </button>
            </div>
          </div>
        </div>

        <AgentDemoResults
          plan={result.plan}
          leadId={result.leadId}
          planId={result.planId}
          showShare
          onReset={resetWizard}
        />
      </div>
    );
  }

  const stepCopy = STEP_COPY[step];

  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <aside className="rounded-[28px] border border-[#d7d0c1] bg-[linear-gradient(180deg,#faf7ef,#efe6d8)] p-6 shadow-[0_18px_56px_rgba(70,58,40,0.08)]">
        <p className="text-[11px] uppercase tracking-[0.32em] text-[#7f7c70]">
          Guided Audit
        </p>
        <h1 className="mt-4 font-[var(--font-editorial)] text-5xl leading-[0.96] tracking-[-0.05em] text-[#1d2318]">
          Audit the workflow before you scope the build.
        </h1>
        <p className="mt-4 text-base leading-7 text-[#556052]">
          This turns a vague ops problem into a structured preview plan with workflow stages, dashboard KPIs, alert ideas, and next actions.
        </p>

        <div className="mt-8 space-y-3">
          {STEP_COPY.map((item, index) => (
            <div
              key={item.title}
              className={`rounded-[22px] border px-4 py-4 transition-colors ${
                index === step
                  ? "border-[#7d8b5d] bg-[#eef1e4]"
                  : index < step
                    ? "border-[#d2c9ba] bg-white/70"
                    : "border-[#ddd6c8] bg-[#f6f1e8]"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.24em] text-[#7f7c70]">
                    {item.eyebrow}
                  </p>
                  <p className="mt-1 text-base font-semibold text-[#1d2318]">
                    {item.title}
                  </p>
                </div>
                <span className="text-sm text-[#5d6652]">
                  {index + 1}/4
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-[#596351]">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </aside>

      <div className="rounded-[28px] border border-[#d7d0c1] bg-[linear-gradient(180deg,#f9f5ec,#f2eadf)] p-6 shadow-[0_18px_56px_rgba(70,58,40,0.08)] sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.26em] text-[#7f7c70]">
              {stepCopy.eyebrow}
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[#1d2318]">
              {stepCopy.title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#596351]">
              {stepCopy.description}
            </p>
          </div>
          <div className="rounded-full border border-[#d4cbbb] bg-white/70 px-3 py-1 text-xs font-medium text-[#516047]">
            {step + 1} of {STEP_COPY.length}
          </div>
        </div>

        <div className="mt-8 space-y-5">
          {step === 0 ? (
            <>
              <Field label="Industry" error={errors.industry}>
                <select
                  value={form.industry}
                  onChange={(event) => setField("industry", event.target.value as GuidedAuditInput["industry"])}
                  className={inputClass(Boolean(errors.industry))}
                >
                  <option value="">Select industry</option>
                  {AUDIT_INDUSTRIES.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </Field>

              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Workflow type" error={errors.workflow_type}>
                  <select
                    value={form.workflow_type}
                    onChange={(event) => setField("workflow_type", event.target.value as GuidedAuditInput["workflow_type"])}
                    className={inputClass(Boolean(errors.workflow_type))}
                  >
                    {AUDIT_WORKFLOW_TYPES.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Team size" error={errors.team_size}>
                  <select
                    value={form.team_size}
                    onChange={(event) => setField("team_size", event.target.value as GuidedAuditInput["team_size"])}
                    className={inputClass(Boolean(errors.team_size))}
                  >
                    {AUDIT_TEAM_SIZES.map((option) => (
                      <option key={option} value={option}>
                        {option} people
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field label="How systemized is the current stack?" error={errors.stack_maturity}>
                <div className="grid gap-3 sm:grid-cols-2">
                  {AUDIT_STACK_MATURITY.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setField("stack_maturity", option)}
                      className={`rounded-[22px] border px-4 py-4 text-left text-sm transition-colors ${
                        form.stack_maturity === option
                          ? "border-[#768757] bg-[#edf1e1] text-[#203019]"
                          : "border-[#d8d0c2] bg-white/70 text-[#5c6653] hover:bg-white"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </Field>
            </>
          ) : null}

          {step === 1 ? (
            <>
              <Field label="What is the bottleneck?" error={errors.bottleneck}>
                <textarea
                  value={form.bottleneck}
                  onChange={(event) => setField("bottleneck", event.target.value)}
                  rows={4}
                  placeholder="Describe the workflow issue in plain language."
                  className={`${inputClass(Boolean(errors.bottleneck))} resize-none`}
                />
              </Field>
              <Field label="Which steps are still manual?" error={errors.manual_steps}>
                <textarea
                  value={form.manual_steps}
                  onChange={(event) => setField("manual_steps", event.target.value)}
                  rows={3}
                  placeholder="Examples: copying data, chasing approvals, dispatch follow-up."
                  className={`${inputClass(Boolean(errors.manual_steps))} resize-none`}
                />
              </Field>
              <Field label="Where do handoffs break?" error={errors.handoff_breaks}>
                <textarea
                  value={form.handoff_breaks}
                  onChange={(event) => setField("handoff_breaks", event.target.value)}
                  rows={3}
                  placeholder="Where does work stall, get lost, or bounce between people?"
                  className={`${inputClass(Boolean(errors.handoff_breaks))} resize-none`}
                />
              </Field>
              <Field label="What is hard to see or report on?" error={errors.visibility_gap}>
                <textarea
                  value={form.visibility_gap}
                  onChange={(event) => setField("visibility_gap", event.target.value)}
                  rows={3}
                  placeholder="What metrics, queues, or exceptions are invisible today?"
                  className={`${inputClass(Boolean(errors.visibility_gap))} resize-none`}
                />
              </Field>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <Field label="Current tools" error={errors.current_tools}>
                <div className="flex flex-wrap gap-2">
                  {TOOL_OPTIONS.map((tool) => {
                    const selected = form.current_tools.includes(tool);
                    return (
                      <button
                        key={tool}
                        type="button"
                        onClick={() => toggleTool(tool)}
                        className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                          selected
                            ? "border-[#768757] bg-[#edf1e1] text-[#203019]"
                            : "border-[#d8d0c2] bg-white/70 text-[#5c6653] hover:bg-white"
                        }`}
                      >
                        {tool}
                      </button>
                    );
                  })}
                </div>
              </Field>

              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Rough volume" error={errors.volume}>
                  <input
                    value={form.volume ?? ""}
                    onChange={(event) => setField("volume", event.target.value)}
                    placeholder="e.g. 120 requests/week"
                    className={inputClass(Boolean(errors.volume))}
                  />
                </Field>
                <Field label="Urgency" error={errors.urgency}>
                  <select
                    value={form.urgency ?? ""}
                    onChange={(event) =>
                      setField(
                        "urgency",
                        (event.target.value || undefined) as GuidedAuditInput["urgency"]
                      )
                    }
                    className={inputClass(Boolean(errors.urgency))}
                  >
                    <option value="">Select urgency</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </Field>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Time lost per week" error={errors.time_lost_per_week}>
                  <select
                    value={form.time_lost_per_week ?? ""}
                    onChange={(event) =>
                      setField(
                        "time_lost_per_week",
                        (event.target.value || undefined) as GuidedAuditInput["time_lost_per_week"]
                      )
                    }
                    className={inputClass(Boolean(errors.time_lost_per_week))}
                  >
                    <option value="">Select estimate</option>
                    {AUDIT_TIME_LOST.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Accuracy or compliance concerns" error={errors.compliance_notes}>
                  <input
                    value={form.compliance_notes ?? ""}
                    onChange={(event) => setField("compliance_notes", event.target.value)}
                    placeholder="Optional"
                    className={inputClass(Boolean(errors.compliance_notes))}
                  />
                </Field>
              </div>
            </>
          ) : null}

          {step === 3 ? (
            <>
              <Field label="What does a better system need to do?" error={errors.desired_outcome}>
                <textarea
                  value={form.desired_outcome}
                  onChange={(event) => setField("desired_outcome", event.target.value)}
                  rows={5}
                  placeholder="Describe the result you want: faster handoffs, clearer dashboards, fewer exceptions, cleaner ownership."
                  className={`${inputClass(Boolean(errors.desired_outcome))} resize-none`}
                />
              </Field>

              <div className="rounded-[24px] border border-[#d5cebf] bg-white/70 p-5">
                <p className="text-[11px] uppercase tracking-[0.26em] text-[#7f7c70]">
                  Audit snapshot
                </p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2 text-sm text-[#445042]">
                  <div>
                    <p className="text-xs uppercase text-[#7f7c70]">Industry</p>
                    <p className="mt-1">{form.industry || "Not selected"}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-[#7f7c70]">Workflow</p>
                    <p className="mt-1">{form.workflow_type}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-[#7f7c70]">Team</p>
                    <p className="mt-1">{form.team_size} people</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-[#7f7c70]">Stack maturity</p>
                    <p className="mt-1">{form.stack_maturity}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-xs uppercase text-[#7f7c70]">Bottleneck</p>
                    <p className="mt-1">{form.bottleneck || "Not described"}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-[#7f7c70]">Tools</p>
                    <p className="mt-1">{form.current_tools.join(", ") || "None selected"}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-[#7f7c70]">Urgency</p>
                    <p className="mt-1">{form.urgency ?? "Not specified"}</p>
                  </div>
                  {form.time_lost_per_week ? (
                    <div>
                      <p className="text-xs uppercase text-[#7f7c70]">Time lost / week</p>
                      <p className="mt-1">{form.time_lost_per_week}</p>
                    </div>
                  ) : null}
                  {form.volume ? (
                    <div>
                      <p className="text-xs uppercase text-[#7f7c70]">Volume</p>
                      <p className="mt-1">{form.volume}</p>
                    </div>
                  ) : null}
                </div>
              </div>
            </>
          ) : null}

          {status === "error" ? (
            <div className="rounded-[18px] border border-[#dc8f8f] bg-[#fff2f2] p-3 text-sm text-[#9d3f3f]">
              {serverError || "Something went wrong. Please try again."}
            </div>
          ) : null}
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t border-[#ddd5c6] pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-[#596351]">
            {step === STEP_COPY.length - 1
              ? "Generate the same preview-plan output, but from structured intake."
              : "You can go back and tighten the answers before generating the plan."}
          </div>
          {status === "submitting" && completedSections.size > 0 && (
            <PlanBuildProgress completedStages={completedSections} />
          )}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep((current) => Math.max(current - 1, 0))}
              disabled={step === 0 || status === "submitting"}
              className="inline-flex rounded-full border border-[#d0c8b8] bg-[#fbf7ef] px-5 py-3 text-sm font-semibold text-[#27311f] transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Back
            </button>
            {step === STEP_COPY.length - 1 ? (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={status === "submitting"}
                className="inline-flex rounded-full bg-[#171d13] px-5 py-3 text-sm font-semibold text-[#f7f2e8] transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {status === "submitting" ? "Generating..." : "Generate audit plan"}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex rounded-full bg-[#171d13] px-5 py-3 text-sm font-semibold text-[#f7f2e8] transition-transform hover:scale-[1.02]"
              >
                Continue
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function sanitizeForm(form: GuidedAuditInput): GuidedAuditInput {
  return {
    ...form,
    bottleneck: form.bottleneck.trim(),
    volume: form.volume?.trim() || undefined,
    manual_steps: form.manual_steps.trim(),
    handoff_breaks: form.handoff_breaks.trim(),
    visibility_gap: form.visibility_gap.trim(),
    desired_outcome: form.desired_outcome.trim(),
    time_lost_per_week: form.time_lost_per_week || undefined,
    compliance_notes: form.compliance_notes?.trim() || undefined,
  };
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-[#24311f]">
        {label}
      </span>
      {children}
      {error ? <p className="mt-1 text-xs text-red-500">{error}</p> : null}
    </label>
  );
}

function inputClass(hasError: boolean) {
  return `w-full rounded-[18px] border bg-[#fbf7ef] px-4 py-3 text-sm text-[#25311f] placeholder:text-[#76806e] focus-organic transition-[border-color,box-shadow] duration-250 ${
    hasError ? "border-[#dc8f8f]" : "border-[#d5cdbd]"
  }`;
}
