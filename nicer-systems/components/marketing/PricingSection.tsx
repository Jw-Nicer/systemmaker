import Link from "next/link";

const tiers = [
  {
    name: "Starter",
    price: "One workflow",
    description: "Mapped and automated in 30 days.",
    features: [
      "End-to-end process map",
      "System of record setup",
      "Basic live dashboard",
      "Automated stuck-work alerts",
      "30-day delivery guarantee",
    ],
    cta: "Book a Scoping Call",
    highlighted: false,
  },
  {
    name: "Growth",
    price: "Full visibility",
    description: "Complete ops visibility system.",
    features: [
      "Everything in Starter",
      "Multi-workflow coverage",
      "Advanced dashboards + KPIs",
      "Weekly Ops Pulse report",
      "Tool integrations (Zapier/Make)",
      "Priority support",
    ],
    cta: "Book a Scoping Call",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom build",
    description: "Tailored ops infrastructure.",
    features: [
      "Everything in Growth",
      "Custom integrations",
      "Dedicated account manager",
      "SLA guarantees",
      "Team training + handoff",
      "Ongoing optimization",
    ],
    cta: "Contact Us",
    highlighted: false,
  },
];

export function PricingSection() {
  return (
    <section className="py-24">
      <div className="max-w-6xl mx-auto px-6">
        <h2 className="text-3xl font-bold text-center mb-4">
          Simple, Outcome-Based Pricing
        </h2>
        <p className="text-muted text-center mb-12 max-w-2xl mx-auto">
          Every engagement starts with a scoping call. We confirm the workflow,
          agree on deliverables, and ship.
        </p>

        <div className="grid md:grid-cols-3 gap-6">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`rounded-xl border p-6 flex flex-col ${
                tier.highlighted
                  ? "border-primary bg-surface shadow-lg shadow-primary/5 relative"
                  : "border-border bg-surface"
              }`}
            >
              {tier.highlighted && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-medium px-3 py-1 rounded-full bg-primary text-background">
                  Most Popular
                </span>
              )}

              <h3 className="text-xl font-bold mb-1">{tier.name}</h3>
              <p className="text-primary font-semibold text-lg mb-1">
                {tier.price}
              </p>
              <p className="text-sm text-muted mb-6">{tier.description}</p>

              <ul className="space-y-2.5 mb-8 flex-1">
                {tier.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 text-sm text-muted"
                  >
                    <svg
                      className="w-4 h-4 text-primary mt-0.5 shrink-0"
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
                className={`block text-center py-3 rounded-lg font-medium text-sm transition-all ${
                  tier.highlighted
                    ? "bg-primary text-background hover:opacity-90"
                    : "border border-border text-foreground hover:border-primary/50 hover:text-primary"
                }`}
              >
                {tier.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
