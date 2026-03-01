import Link from "next/link";

interface FinalCTAProps {
  ctaText?: string;
}

export function FinalCTA({ ctaText }: FinalCTAProps = {}) {
  return (
    <section className="py-24">
      <div className="max-w-3xl mx-auto px-6 text-center">
        <h2 className="text-3xl font-bold mb-4">
          Ready to see your operations clearly?
        </h2>
        <p className="text-muted mb-8">
          Book a 45-minute scoping call. We&apos;ll confirm one workflow and
          ship a plan within 24 hours.
        </p>
        <Link
          href="/contact"
          className="inline-block px-8 py-4 rounded-lg bg-primary text-background font-semibold text-lg hover:opacity-90 transition-opacity"
        >
          {ctaText || "Book a Scoping Call"}
        </Link>
      </div>
    </section>
  );
}
