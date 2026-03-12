"use client";

import { useRef, useState, useEffect, lazy, Suspense } from "react";
import { motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { Logo } from "@/components/ui/Logo";
import { TrackedLink } from "@/components/marketing/TrackedLink";
import { BookingCTAButton } from "@/components/marketing/BookingCTAButton";
import { FlowText } from "@/components/ui/GlitchText";
import { EVENTS, track } from "@/lib/analytics";

const BrushRevealCanvas = lazy(() =>
  import("@/components/marketing/BrushRevealCanvas").then((m) => ({
    default: m.BrushRevealCanvas,
  }))
);

const bookingUrl = process.env.NEXT_PUBLIC_BOOKING_URL;

const queryCards = [
  {
    id: "01",
    label: "/scope",
    prompt:
      "Map our lead intake workflow and show where follow-up delays are creating missed handoffs.",
  },
  {
    id: "02",
    label: "/kpis",
    prompt:
      "Draft the KPI dashboard we should review weekly to catch stuck work before it escalates.",
  },
  {
    id: "03",
    label: "/automate",
    prompt:
      "Recommend the first automation pass for our current tool stack without replacing everything.",
  },
];

interface BrushRevealHeroProps {
  headline?: string;
  subheadline?: string;
  ctaText?: string;
  proofLine?: string;
}

export function BrushRevealHero({
  headline,
  subheadline,
  ctaText,
  proofLine,
}: BrushRevealHeroProps = {}) {
  const reducedMotion = useReducedMotion();
  const videoRef = useRef<HTMLDivElement>(null);
  const [videoVisible, setVideoVisible] = useState(false);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVideoVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const heroHeadline = headline ?? "Tell us the problem.\nWe'll build the system.";
  const heroSubheadline =
    subheadline ??
    "Turn a messy operational bottleneck into an actionable preview plan. We map the workflow, define the KPIs, outline the alerts, and show the next actions before implementation starts.";
  const heroProofLine =
    proofLine ??
    "Get a shareable preview plan with workflow, KPI, and alert recommendations.";

  return (
    <section
      id="hero"
      className="computer-hero relative overflow-hidden border-b border-[var(--border-light)] bg-[var(--cream-bg)]"
    >
      {!reducedMotion && (
        <Suspense fallback={null}>
          <div className="pointer-events-none absolute inset-0 z-0 opacity-25 mix-blend-overlay">
            <BrushRevealCanvas />
          </div>
        </Suspense>
      )}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(164,141,108,0.22),transparent_28%),linear-gradient(180deg,rgba(248,243,232,0)_0%,rgba(235,226,210,0.85)_78%,rgba(228,220,204,1)_100%)]" />
      <div className="pointer-events-none absolute inset-y-0 left-0 w-[42%] bg-[radial-gradient(circle_at_left,rgba(255,255,255,0.55),transparent_62%)]" />

      <div className="relative mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:gap-10 sm:px-6 sm:py-14 md:min-h-[calc(100vh-72px)] lg:grid-cols-[minmax(0,1.05fr)_minmax(380px,0.95fr)] lg:items-center lg:px-10 lg:py-20">
        <div className="relative z-10 order-1">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              type: reducedMotion ? "tween" : "spring",
              stiffness: 80,
              damping: 20,
              delay: 0.05,
            }}
            className="max-w-[44rem] rounded-[var(--radius-card)] border border-white/70 bg-[var(--cream-warm)]/88 p-5 shadow-[var(--shadow-elevated)] backdrop-blur-md sm:rounded-[var(--radius-card-lg)] sm:p-8 lg:p-9"
          >
            <Logo size="sm" variant="minimal" className="mb-4 opacity-70" />
            <h1 className="mt-5 max-w-[11ch] font-[var(--font-editorial)] text-[clamp(2.35rem,10vw,5.1rem)] leading-[0.95] tracking-[-0.05em] text-[var(--text-heading)]">
              {heroHeadline.split("\n").map((line, index, arr) => (
                <span key={line}>
                  <FlowText text={line} staggerDelay={0.04} />
                  {index < arr.length - 1 && <br />}
                </span>
              ))}
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-[var(--text-body)] sm:text-lg sm:leading-8">
              {heroSubheadline}
            </p>

            <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
              <BookingCTAButton
                source="hero"
                ctaText={ctaText ?? "Book a Scoping Call"}
                className="rounded-full bg-[var(--green-dark)] px-7 py-3.5 text-center text-sm font-medium text-[var(--cream-warm)] shadow-[var(--shadow-card)] transition-transform hover:scale-[1.02]"
              />
              <a
                href="#see-it-work"
                onClick={() => track(EVENTS.CTA_CLICK_PREVIEW_PLAN)}
                className="rounded-full border border-[#465240]/18 bg-white/50 px-7 py-3.5 text-center text-sm font-medium text-[var(--text-heading)] transition-colors hover:bg-white/72"
              >
                Get a Preview Plan
              </a>
            </div>

            <p className="mt-5 text-sm font-medium text-[var(--text-accent)]">{heroProofLine}</p>

            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              {queryCards.map((card, index) => (
                <motion.div
                  key={card.id}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    type: reducedMotion ? "tween" : "spring",
                    stiffness: 80,
                    damping: 20,
                    delay: 0.14 + index * 0.08,
                  }}
                  className="rounded-[var(--radius-card)] border border-[#cad9c8] bg-[linear-gradient(180deg,rgba(255,255,255,0.58),rgba(244,240,231,0.82))] p-4 shadow-[var(--shadow-card)]"
                >
                  <div className="flex items-center justify-between text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">
                    <span>{card.id}</span>
                    <span className="rounded-full border border-[#b9cab6] bg-[#edf4ea] px-2.5 py-1 text-[#40603f]">
                      {card.label}
                    </span>
                  </div>
                  <p className="mt-3 text-sm font-medium leading-6 text-[var(--text-heading)]">
                    {card.prompt}
                  </p>
                </motion.div>
              ))}
            </div>

            <div className="mt-7 flex flex-col gap-4 text-sm text-[var(--text-body)] sm:flex-row sm:flex-wrap sm:items-center sm:gap-5">
              <div>
                <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">
                  Output
                </p>
                <p className="mt-1">Workflow, KPIs, alerts, actions</p>
              </div>
              <div className="hidden h-8 w-px bg-[#d7d0c2] sm:block" />
              <div>
                <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">
                  Format
                </p>
                <p className="mt-1">Shareable preview plan</p>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="relative order-2">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              type: reducedMotion ? "tween" : "spring",
              stiffness: 80,
              damping: 20,
                delay: 0.12,
              }}
            className="relative overflow-hidden rounded-[var(--radius-card-lg)] border border-[#efe6d6] bg-[#ece3d0] p-3 shadow-[var(--shadow-elevated)] sm:rounded-[var(--radius-card-lg)] sm:p-4"
          >
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.18),rgba(255,255,255,0.02))]" />
            <div className="relative flex flex-col gap-3 px-3 pb-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">
                  Preview Plan Interface
                </p>
                <p className="mt-1 max-w-xs text-sm font-medium text-[var(--text-heading)]">
                  Example outputs the agent can generate.
                </p>
              </div>
              <div className="hidden items-center gap-2 rounded-full bg-[#1b2116] px-3.5 py-2 text-[11px] uppercase tracking-[0.12em] text-[#f4efe4] shadow-[0_10px_22px_rgba(23,33,22,0.24)] sm:flex">
                <span className="h-2 w-2 rounded-full bg-green-400" />
                Live workflow
              </div>
            </div>

            <div className="relative overflow-hidden rounded-[32px]">
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.9, delay: 0.18 }}
                className="relative aspect-[4/5] min-h-[320px] w-full overflow-hidden bg-[#d6c8ad] sm:aspect-[5/4] sm:min-h-[420px] lg:min-h-[560px]"
              >
                <div ref={videoRef}>
                  {videoVisible ? (
                    <video
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="h-full w-full object-cover"
                      aria-label="Ambient glass orb animation"
                    >
                      <source src="/glass-orb.mp4" type="video/mp4" />
                    </video>
                  ) : (
                    <div className="h-full w-full bg-[#d6c8ad]" />
                  )}
                </div>
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(17,22,14,0.10),rgba(17,22,14,0.26))]" />
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(255,255,255,0.30),transparent_26%),linear-gradient(180deg,rgba(244,239,229,0.05),rgba(244,239,229,0.30)_78%,rgba(244,239,229,0.58)_100%)]" />

                <div className="absolute inset-x-3 bottom-3 rounded-[24px] border border-white/40 bg-[rgba(247,242,232,0.82)] p-4 backdrop-blur-md sm:inset-x-6 sm:bottom-6 sm:rounded-[28px] sm:p-6">
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--text-muted)]">
                    Typical deliverable
                  </p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[var(--radius-card)] border border-[#ddd5c7] bg-white/62 p-4 shadow-[var(--shadow-card)]">
                      <p className="text-sm font-semibold text-[var(--text-heading)]">
                        Workflow map
                      </p>
                      <p className="mt-2 text-sm leading-6 text-[var(--text-body)]">
                        Stage-by-stage handoffs, failure points, and owners.
                      </p>
                    </div>
                    <div className="rounded-[var(--radius-card)] border border-[#ddd5c7] bg-white/62 p-4 shadow-[var(--shadow-card)]">
                      <p className="text-sm font-semibold text-[var(--text-heading)]">
                        KPI and alert layer
                      </p>
                      <p className="mt-2 text-sm leading-6 text-[var(--text-body)]">
                        The metrics, triggers, and next actions to review before implementation.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
