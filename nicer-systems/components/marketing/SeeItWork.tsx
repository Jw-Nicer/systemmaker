"use client";

import dynamic from "next/dynamic";
import { ScrollReveal } from "./ScrollReveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { GlowLine } from "@/components/ui/GlowLine";

const AgentChat = dynamic(
  () => import("./AgentChat").then((m) => ({ default: m.AgentChat })),
  {
    ssr: false,
    loading: () => (
      <div className="h-[480px] sm:h-[520px] flex items-center justify-center text-sm text-muted">
        Initializing agent...
      </div>
    ),
  }
);

export function SeeItWork() {
  return (
    <section id="see-it-work" className="py-24 bg-surface/30">
      <div className="max-w-4xl mx-auto px-6">
        <ScrollReveal>
          <SectionHeading
            eyebrow="Live Demo"
            title="See It Work"
            description="Tell our agent about your bottleneck. It'll ask a few questions, then build a custom Preview Plan — live."
          />
        </ScrollReveal>

        <ScrollReveal delay={0.2}>
          <div className="relative rounded-xl border border-glass-border bg-glass-bg backdrop-blur-[var(--glass-blur)] overflow-hidden gradient-border hover:shadow-[var(--glow-md)] transition-shadow scan-lines">
            {/* Terminal header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-glass-border bg-surface-light/50">
              <div className="w-3 h-3 rounded-full bg-red-500/60" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
              <div className="w-3 h-3 rounded-full bg-green-500/60 shadow-[0_0_6px_rgba(34,197,94,0.4)]" />
              <span className="ml-2 text-xs text-muted font-mono">
                nicer-agent
              </span>
            </div>

            <GlowLine />

            {/* Chat body */}
            <div className="relative z-[2]">
              <AgentChat />
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
