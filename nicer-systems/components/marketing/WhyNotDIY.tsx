"use client";

import { ScrollReveal } from "@/components/marketing/ScrollReveal";
import { TrackedLink } from "@/components/marketing/TrackedLink";
import { EVENTS } from "@/lib/analytics";

const rows = [
  {
    dimension: "Time to first output",
    diy: "Weeks of configuration",
    consultant: "Weeks of discovery",
    nicer: "Under a minute",
  },
  {
    dimension: "What you receive",
    diy: "A tool you configured yourself",
    consultant: "A slide deck with recommendations",
    nicer: "A workflow map, KPIs, alerts, and actions — ready to review",
  },
  {
    dimension: "Who maintains it",
    diy: "You — every workflow change means reconfiguring",
    consultant: "Your team — the consultant leaves",
    nicer: "You own it, we document how it works",
  },
  {
    dimension: "After 90 days",
    diy: "The system drifted. Nobody updates it.",
    consultant: "The deck is on a shelf. Nothing was built.",
    nicer: "One bottleneck is fixed. You decide what's next.",
  },
];

export function WhyNotDIY() {
  return (
    <section
      id="why-this"
      className="relative overflow-hidden border-b border-[var(--border-light)] bg-[var(--cream-bg)] py-16 sm:py-24"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_0%,rgba(28,54,42,0.06),transparent_35%),radial-gradient(circle_at_0%_100%,rgba(207,188,154,0.10),transparent_30%)]" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
        <ScrollReveal>
          <div className="mb-12 max-w-3xl sm:mb-16">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)] sm:tracking-[0.22em]">
              Why this instead
            </p>
            <h2 className="mt-4 font-[var(--font-editorial)] text-4xl leading-[0.95] tracking-[-0.04em] text-[var(--text-heading)] sm:text-5xl md:text-7xl">
              Three ways to fix<br />a broken workflow
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--text-body)]">
              You can configure tools yourself, hire someone to advise, or get a
              scoped system built around the actual bottleneck. Here's how they compare.
            </p>
          </div>
        </ScrollReveal>

        {/* Desktop: comparison grid */}
        <ScrollReveal>
          <div className="hidden overflow-hidden rounded-[var(--radius-card-lg)] border border-[var(--border-card)] shadow-[var(--shadow-elevated)] md:block">
            {/* Header */}
            <div className="grid grid-cols-[1fr_1fr_1fr_1.2fr] border-b border-[var(--border-subtle)]">
              <div className="bg-[var(--cream-card)] p-5" />
              <div className="border-l border-[var(--border-subtle)] bg-[var(--cream-card)] p-5">
                <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">
                  DIY with generic tools
                </p>
              </div>
              <div className="border-l border-[var(--border-subtle)] bg-[var(--cream-card)] p-5">
                <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">
                  Hire a consultant
                </p>
              </div>
              <div className="border-l border-[var(--border-subtle)] bg-[linear-gradient(180deg,rgba(28,54,42,0.98),rgba(20,36,27,0.96))] p-5">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#aec2ad]" />
                  <p className="text-xs uppercase tracking-[0.14em] text-[#aec2ad]">
                    Nicer Systems
                  </p>
                </div>
              </div>
            </div>

            {/* Rows */}
            {rows.map((row, i) => (
              <div
                key={row.dimension}
                className={`grid grid-cols-[1fr_1fr_1fr_1.2fr] ${
                  i < rows.length - 1 ? "border-b border-[var(--border-subtle)]" : ""
                }`}
              >
                <div className="bg-[var(--cream-muted)] p-5">
                  <p className="text-sm font-medium text-[var(--text-heading)]">
                    {row.dimension}
                  </p>
                </div>
                <div className="border-l border-[var(--border-subtle)] bg-[var(--cream-card)] p-5">
                  <p className="text-sm leading-6 text-[var(--text-body)]">
                    {row.diy}
                  </p>
                </div>
                <div className="border-l border-[var(--border-subtle)] bg-[var(--cream-card)] p-5">
                  <p className="text-sm leading-6 text-[var(--text-body)]">
                    {row.consultant}
                  </p>
                </div>
                <div className="border-l border-[var(--border-subtle)] bg-[linear-gradient(180deg,rgba(28,54,42,0.98),rgba(20,36,27,0.96))] p-5">
                  <p className="text-sm leading-6 text-[#eef2ea]">
                    {row.nicer}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollReveal>

        {/* Mobile: stacked cards */}
        <div className="space-y-4 md:hidden">
          {/* DIY card */}
          <ScrollReveal>
            <div className="rounded-[var(--radius-card)] border border-[var(--border-card)] bg-[var(--cream-card)] p-5 opacity-75">
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">
                DIY with generic tools
              </p>
              <dl className="mt-4 space-y-3">
                {rows.map((row) => (
                  <div key={row.dimension}>
                    <dt className="text-xs font-medium text-[var(--text-muted)]">
                      {row.dimension}
                    </dt>
                    <dd className="mt-0.5 text-sm text-[var(--text-body)]">
                      {row.diy}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </ScrollReveal>

          {/* Consultant card */}
          <ScrollReveal delay={0.08}>
            <div className="rounded-[var(--radius-card)] border border-[var(--border-card)] bg-[var(--cream-card)] p-5 opacity-75">
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">
                Hire a consultant
              </p>
              <dl className="mt-4 space-y-3">
                {rows.map((row) => (
                  <div key={row.dimension}>
                    <dt className="text-xs font-medium text-[var(--text-muted)]">
                      {row.dimension}
                    </dt>
                    <dd className="mt-0.5 text-sm text-[var(--text-body)]">
                      {row.consultant}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </ScrollReveal>

          {/* Nicer Systems card — highlighted */}
          <ScrollReveal delay={0.16}>
            <div className="rounded-[var(--radius-card-lg)] border border-[#2f4c37]/20 bg-[linear-gradient(180deg,rgba(28,54,42,0.98),rgba(20,36,27,0.96))] p-6 text-[#edf2e8] shadow-[var(--shadow-elevated)]">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#aec2ad]" />
                <p className="text-xs uppercase tracking-[0.14em] text-[#aec2ad]">
                  Nicer Systems
                </p>
              </div>
              <dl className="mt-4 space-y-3">
                {rows.map((row) => (
                  <div key={row.dimension}>
                    <dt className="text-xs font-medium text-[#92a792]">
                      {row.dimension}
                    </dt>
                    <dd className="mt-0.5 text-sm text-[#eef2ea]">
                      {row.nicer}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </ScrollReveal>
        </div>

        <ScrollReveal delay={0.2}>
          <div className="mt-12 flex flex-col items-start gap-4 sm:mt-16 sm:flex-row sm:items-center">
            <TrackedLink
              href="/contact"
              eventName={EVENTS.CTA_CLICK_BOOK}
              className="rounded-full bg-[var(--green-dark)] px-7 py-3.5 text-sm font-medium text-[var(--cream-warm)] shadow-[var(--shadow-card)] transition-transform hover:scale-[1.02]"
            >
              Book a Scoping Call
            </TrackedLink>
            <p className="text-sm text-[var(--text-muted)]">
              45 minutes. One workflow. Clear next steps.
            </p>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
