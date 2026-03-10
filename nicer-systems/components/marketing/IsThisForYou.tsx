"use client";

import { ScrollReveal, StaggeredReveal } from "@/components/marketing/ScrollReveal";
import { TrackedLink } from "@/components/marketing/TrackedLink";
import { EVENTS } from "@/lib/analytics";

const personas = [
  {
    role: "Ops Owner",
    pain: "I need fewer fire drills and visibility into work-in-progress.",
    scenario:
      "Your Monday starts with three Slack threads about the same stuck ticket. You built a tracker last quarter but nobody updates it. You need a system that surfaces problems before they become emergencies.",
    outcome:
      "A workflow map with clear owners at every stage, automated alerts when work stalls, and a dashboard you actually check.",
  },
  {
    role: "Founder / GM",
    pain: "I want predictable operations without micromanaging.",
    scenario:
      "You ask for a weekly update and get a different spreadsheet every time. You can't tell if the team is ahead or behind without a 30-minute call. You need reporting that runs itself.",
    outcome:
      "Weekly Ops Pulse reports, KPI dashboards with thresholds, and escalation rules so you manage by exception — not by asking.",
  },
  {
    role: "Internal Operator",
    pain: "I need to update workflows without waiting on engineering.",
    scenario:
      "A process changed two months ago but the automations still run the old way. You filed a ticket to fix it. It's still in the backlog. You need workflows that your team can own.",
    outcome:
      "Documented processes with clear automation rules, so changes don't require a developer or a workaround.",
  },
];

export function IsThisForYou() {
  return (
    <section
      id="who-its-for"
      className="relative overflow-hidden border-b border-[var(--border-light)] bg-[var(--cream-bg)] py-16 sm:py-24"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_0%,rgba(28,54,42,0.08),transparent_40%),radial-gradient(circle_at_80%_100%,rgba(207,188,154,0.12),transparent_35%)]" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
        <ScrollReveal>
          <div className="mb-12 max-w-3xl sm:mb-16">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)] sm:tracking-[0.22em]">
              Is this for you?
            </p>
            <h2 className="mt-4 font-[var(--font-editorial)] text-4xl leading-[0.95] tracking-[-0.04em] text-[var(--text-heading)] sm:text-5xl md:text-7xl">
              Built for the people<br />who run the work
            </h2>
          </div>
        </ScrollReveal>

        <StaggeredReveal className="space-y-6 sm:space-y-8">
          {personas.map((persona, index) => (
            <article
              key={persona.role}
              className="grid gap-6 lg:grid-cols-[340px_1fr] lg:items-start lg:gap-8"
            >
              {/* Left: identity card */}
              <div className="rounded-[var(--radius-card)] border border-[var(--border-card)] bg-[var(--cream-card)] p-6 shadow-[var(--shadow-card)] sm:rounded-[var(--radius-card-lg)] sm:p-8">
                <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <h3 className="mt-4 font-[var(--font-editorial)] text-3xl leading-tight text-[var(--text-heading)] sm:text-4xl">
                  {persona.role}
                </h3>
                <p className="mt-4 text-lg leading-snug text-[var(--text-heading)]">
                  &ldquo;{persona.pain}&rdquo;
                </p>
              </div>

              {/* Right: scenario + outcome (dark panel) */}
              <div className="rounded-[var(--radius-card-lg)] border border-[#2f4c37]/20 bg-[linear-gradient(180deg,rgba(28,54,42,0.98),rgba(20,36,27,0.96))] p-5 text-[#edf2e8] shadow-[var(--shadow-elevated)] sm:p-6">
                <div className="space-y-5">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.14em] text-[#92a792]">
                      Sound familiar?
                    </p>
                    <p className="mt-2 text-sm leading-7 text-[#d4ddd2]">
                      {persona.scenario}
                    </p>
                  </div>
                  <div className="border-t border-white/10 pt-5">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-[#aec2ad]">
                      What you get instead
                    </p>
                    <p className="mt-2 text-sm leading-7 text-[#eef2ea]">
                      {persona.outcome}
                    </p>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </StaggeredReveal>

        <ScrollReveal delay={0.2}>
          <div className="mt-12 flex flex-col items-start gap-4 sm:mt-16 sm:flex-row sm:items-center">
            <TrackedLink
              href="#see-it-work"
              eventName={EVENTS.CTA_CLICK_PREVIEW_PLAN}
              className="rounded-full bg-[var(--green-dark)] px-7 py-3.5 text-sm font-medium text-[var(--cream-warm)] shadow-[var(--shadow-card)] transition-transform hover:scale-[1.02]"
            >
              See it in action
            </TrackedLink>
            <p className="text-sm text-[var(--text-muted)]">
              Try the agent demo — describe a bottleneck, get a preview plan.
            </p>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
