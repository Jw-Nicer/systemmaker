import Link from "next/link";
import { GlowLine } from "@/components/ui/GlowLine";

interface FinalCTAProps {
  ctaText?: string;
}

export function FinalCTA({ ctaText }: FinalCTAProps = {}) {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Radial glow background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at center, rgba(0, 212, 255, 0.06) 0%, transparent 70%)",
        }}
        aria-hidden="true"
      />

      <GlowLine />

      <div className="max-w-3xl mx-auto px-6 text-center relative z-[1] py-8">
        <h2 className="text-3xl md:text-4xl font-bold mb-4 text-glow">
          Ready to see your operations clearly?
        </h2>
        <p className="text-muted mb-8 leading-relaxed">
          Book a 45-minute scoping call. We&apos;ll confirm one workflow and
          ship a plan within 24 hours.
        </p>
        <Link
          href="/contact"
          className="inline-block px-8 py-4 rounded-xl bg-primary text-background font-semibold text-lg hover:shadow-[var(--glow-md)] active:scale-[0.97] transition-all animate-[pulse-glow_3s_ease-in-out_infinite]"
        >
          {ctaText || "Book a Scoping Call"}
        </Link>
      </div>

      <GlowLine />
    </section>
  );
}
