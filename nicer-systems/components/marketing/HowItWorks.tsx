"use client";

import { ScrollReveal } from "./ScrollReveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Badge } from "@/components/ui/Badge";

const steps = [
  {
    step: "01",
    title: "Map",
    desc: "We map your core workflow end-to-end",
    deliverable: "Process map + data model",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="11" cy="11" r="8" />
        <path d="M21 21l-4.35-4.35" />
      </svg>
    ),
  },
  {
    step: "02",
    title: "Build",
    desc: "System of record + dashboards go live",
    deliverable: "Live dashboards + alerts",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      </svg>
    ),
  },
  {
    step: "03",
    title: "Alert",
    desc: "Automated alerts surface stuck work",
    deliverable: "Automated stuck-work alerts",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    ),
  },
  {
    step: "04",
    title: "Pulse",
    desc: "Weekly Ops Pulse keeps you informed",
    deliverable: "Weekly Ops Pulse report",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
];

export function HowItWorks() {
  return (
    <section className="py-24 bg-surface/30 noise-overlay relative overflow-hidden">
      <div className="max-w-6xl mx-auto px-6 relative z-[1]">
        <ScrollReveal>
          <SectionHeading
            eyebrow="Process"
            title="How It Works"
          />
        </ScrollReveal>

        {/* Timeline */}
        <div className="relative">
          {/* Connecting line (desktop) — gradient glow */}
          <div className="hidden md:block absolute top-16 left-0 right-0 h-px bg-[var(--gradient-glow-line)] opacity-40" />

          <div className="grid md:grid-cols-4 gap-8 md:gap-6">
            {steps.map((item, i) => (
              <ScrollReveal key={item.step} delay={i * 0.15}>
                <div className="relative text-center group">
                  {/* Step number + icon */}
                  <div className="relative mx-auto w-16 h-16 rounded-full border border-glass-border bg-glass-bg backdrop-blur-[var(--glass-blur)] flex items-center justify-center mb-4 group-hover:border-primary/50 group-hover:shadow-[var(--glow-md)] transition-all">
                    <div className="text-primary/60 group-hover:text-primary group-hover:[filter:drop-shadow(0_0_8px_rgba(0,212,255,0.5))] transition-all">
                      {item.icon}
                    </div>
                  </div>

                  {/* Step label */}
                  <div className="text-xs font-mono text-primary/40 mb-1 text-glow">
                    {item.step}
                  </div>

                  <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                  <p className="text-muted text-sm mb-3 leading-relaxed">{item.desc}</p>

                  {/* Deliverable tag */}
                  <Badge variant="primary">{item.deliverable}</Badge>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
