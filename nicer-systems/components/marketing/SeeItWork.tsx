"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";

const AgentChat = dynamic(
  () => import("./AgentChat").then((m) => ({ default: m.AgentChat })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[380px] flex-col items-center justify-center gap-3 px-4 text-center sm:h-[520px]">
        <div className="flex gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[var(--green-accent)]/40 animate-[typing-bounce_1.4s_ease-in-out_infinite]" />
          <span className="h-2 w-2 rounded-full bg-[var(--green-accent)]/40 animate-[typing-bounce_1.4s_ease-in-out_0.2s_infinite]" style={{ animationDelay: '0.2s' }} />
          <span className="h-2 w-2 rounded-full bg-[var(--green-accent)]/40 animate-[typing-bounce_1.4s_ease-in-out_0.4s_infinite]" style={{ animationDelay: '0.4s' }} />
        </div>
        <span className="text-sm text-[var(--text-muted)]">Initializing agent...</span>
      </div>
    ),
  }
);

export function SeeItWork({
  eyebrow = "Live Demo",
  title = "Build a preview plan",
  description = "Tell the agent about your bottleneck. It asks a few intake questions, then streams a draft preview plan with workflow stages, KPIs, alerts, and recommended actions.",
}: {
  eyebrow?: string;
  title?: string;
  description?: string;
} = {}) {
  const reducedMotion = useReducedMotion();

  return (
    <section id="see-it-work" className="border-b border-[var(--border-light)] bg-[var(--cream-bg)] py-16 sm:py-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={reducedMotion ? { duration: 0.3 } : { type: "spring", stiffness: 80, damping: 20 }}
          className="mb-10"
        >
          <p className="text-xs uppercase tracking-[0.22em] sm:tracking-[0.3em] text-[var(--text-muted)]">
            {eyebrow}
          </p>
          <h2 className="mt-4 font-[var(--font-editorial)] text-4xl leading-[0.96] tracking-[-0.04em] text-[var(--text-heading)] sm:text-5xl md:text-7xl">
            {title}
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--text-body)]">
            {description}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={reducedMotion ? { duration: 0.3, delay: 0.1 } : { type: "spring", stiffness: 80, damping: 20, delay: 0.15 }}
        >
          <div className="relative overflow-hidden rounded-[var(--radius-card-lg)] border border-[#cfd1c2] bg-[linear-gradient(180deg,#f8f4ea,#eee6d8)] shadow-[var(--shadow-elevated)]">
            {/* Status header */}
            <div className="flex flex-col gap-3 border-b border-[#d0c8ba] bg-[linear-gradient(180deg,rgba(255,255,255,0.56),rgba(242,234,220,0.92))] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5">
              <div className="relative flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 rounded-full border border-[#6d7a42]/28 bg-[linear-gradient(180deg,#f1f4e8,#e3ead2)] px-3 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]">
                  <div className="h-2 w-2 rounded-full bg-[#55722b] animate-[breathe_3s_ease-in-out_infinite] shadow-[0_0_0_4px_rgba(85,114,43,0.12)]" />
                  <span className="text-xs font-medium text-[#315329]">Streaming</span>
                </div>
                <span className="text-xs text-[#616657]">
                  preview-plan-agent
                </span>
              </div>
              <span className="hidden rounded-full border border-[#88956d]/28 bg-[linear-gradient(180deg,rgba(232,239,219,0.85),rgba(248,244,234,0.7))] px-3 py-1 text-[11px] uppercase tracking-[0.12em] text-[#47553b] shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] sm:inline-flex">
                Workflow, KPIs, alerts
              </span>
            </div>

            {/* Chat body */}
            <div className="relative z-[2] bg-[linear-gradient(180deg,rgba(247,242,232,0.84),rgba(234,228,214,0.94))]">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(84,104,41,0.28),transparent)]" />
              <AgentChat />
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 rounded-[26px] border border-[#d5cdbd] bg-[linear-gradient(180deg,rgba(255,255,255,0.75),rgba(246,239,227,0.95))] px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-[#7f7c70]">
                Prefer a structured format?
              </p>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#556052]">
                Run the guided audit to map workflow breaks, reporting gaps, and desired outcomes before generating the preview plan.
              </p>
            </div>
            <Link
              href="/audit"
              className="inline-flex shrink-0 rounded-full bg-[#171d13] px-5 py-3 text-sm font-semibold text-[#f7f2e8] transition-transform hover:scale-[1.02]"
            >
              Try the Guided Audit &rarr;
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
