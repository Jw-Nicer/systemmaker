import Link from "next/link";
import { getPublishedOffers } from "@/lib/firestore/offers";

export async function PricingSection({
  eyebrow = "Pricing",
  title = "Simple, outcome-based\npricing",
  description = "Every engagement starts with a scoping call. We confirm the workflow, define the deliverables, and align the implementation plan to your actual operating stack.",
  highlightedTier,
}: {
  eyebrow?: string;
  title?: string;
  description?: string;
  highlightedTier?: string;
} = {}) {
  const tiers = await getPublishedOffers();

  if (tiers.length === 0) {
    return null;
  }

  return (
    <section id="pricing" className="border-b border-[var(--border-light)] bg-[var(--cream-bg)] py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-12 max-w-3xl sm:mb-16">
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-muted)] sm:tracking-[0.3em]">
            {eyebrow}
          </p>
          <h2 className="mt-4 font-[var(--font-editorial)] text-4xl leading-[0.96] tracking-[-0.04em] text-[var(--text-heading)] sm:text-5xl md:text-7xl">
            {title.split("\n").map((line, index, arr) => (
              <span key={`${line}-${index}`}>
                {line}
                {index < arr.length - 1 && <br />}
              </span>
            ))}
          </h2>
          <p className="mt-4 text-base leading-7 text-[var(--text-body)]">
            {description}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3 md:items-stretch">
          {tiers.map((tier) => {
            const isHighlighted = highlightedTier
              ? tier.name === highlightedTier
              : tier.highlighted;

            return (
            <div
              key={tier.name}
              className={`relative flex flex-col overflow-hidden p-5 transition-all duration-300 sm:p-6 ${
                isHighlighted
                  ? "rounded-[var(--radius-card-lg)] border border-[#274332]/25 bg-[linear-gradient(180deg,#22402f,#162d21)] text-[#f2ebdc] shadow-[var(--shadow-elevated)] md:-mt-2 md:mb-[-0.5rem]"
                  : "bg-[var(--cream-card)] text-[var(--text-heading)] rounded-[var(--radius-card-lg)] border border-white/60 shadow-[var(--shadow-card)]"
              }`}
            >
              {isHighlighted && (
                <div className="absolute -top-px left-1/2 -translate-x-1/2">
                  <span className="inline-block rounded-b-full bg-[#f8f4ea] px-4 py-1 text-xs font-medium uppercase tracking-[0.14em] text-[#173220]">
                    Most Popular
                  </span>
                </div>
              )}

              <h3 className="text-xl font-bold mb-1 mt-2">{tier.name}</h3>
              <p
                className={`font-[var(--font-editorial)] text-2xl mb-1 ${
                  isHighlighted ? "text-[#bcd8bb]" : "text-[var(--green-accent)]"
                }`}
              >
                {tier.price}
              </p>
              <p
                className={`text-sm mb-6 ${
                  isHighlighted ? "text-[#c2d0c0]" : "text-[var(--text-body)]"
                }`}
              >
                {tier.description}
              </p>

              <ul className="space-y-2.5 mb-8 flex-1">
                {tier.features.map((feature) => (
                  <li
                    key={feature}
                    className={`flex items-start gap-2 text-sm ${
                      isHighlighted ? "text-[#d2dbce]" : "text-[var(--text-body)]"
                    }`}
                  >
                    <svg
                      className={`w-4 h-4 mt-0.5 shrink-0 ${
                        isHighlighted ? "text-[#b6c9b4]" : "text-[var(--text-accent)]"
                      }`}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>

              <Link
                href="/contact"
                className={`block text-center py-3 rounded-full font-medium text-sm transition-all ${
                  isHighlighted
                    ? "bg-[#f2eadb] text-[#132015] hover:bg-[#f8f4ea] hover:shadow-[0_8px_30px_rgba(242,234,219,0.2)]"
                    : "bg-[#161b12] text-[#f5f0e5] hover:shadow-[0_8px_30px_rgba(22,27,18,0.2)]"
                }`}
              >
                {tier.cta}
              </Link>
            </div>
          )})}
        </div>
      </div>
    </section>
  );
}
