"use client";

import { ScrollReveal } from "./ScrollReveal";
import { AgentChat } from "./AgentChat";

export function SeeItWork() {
  return (
    <section id="see-it-work" className="py-24">
      <div className="max-w-4xl mx-auto px-6">
        <ScrollReveal>
          <h2 className="text-3xl font-bold text-center mb-4">See It Work</h2>
          <p className="text-muted text-center mb-12">
            Tell our agent about your bottleneck. It&apos;ll ask a few
            questions, then build a custom Preview Plan — live.
          </p>
        </ScrollReveal>

        <ScrollReveal delay={0.2}>
          <div className="relative rounded-xl border border-border bg-surface overflow-hidden">
            {/* Terminal header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-surface-light">
              <div className="w-3 h-3 rounded-full bg-red-500/60" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
              <div className="w-3 h-3 rounded-full bg-green-500/60" />
              <span className="ml-2 text-xs text-muted font-mono">
                nicer-agent
              </span>
            </div>

            {/* Chat body */}
            <AgentChat />
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
