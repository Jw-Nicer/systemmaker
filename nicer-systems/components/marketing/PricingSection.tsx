import Link from "next/link";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Badge } from "@/components/ui/Badge";
import { GlassCard } from "@/components/ui/GlassCard";

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
        <SectionHeading
          eyebrow="Pricing"
          title="Simple, Outcome-Based Pricing"
          description="Every engagement starts with a scoping call. We confirm the workflow, agree on deliverables, and ship."
        />

        <div className="grid md:grid-cols-3 gap-6">
          {tiers.map((tier) => (
            <GlassCard
              key={tier.name}
              hover
              className={`p-6 flex flex-col relative ${
                tier.highlighted
                  ? "gradient-border gradient-border-active shadow-[var(--glow-md)]"
                  : ""
              }`}
            >
              {tier.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge variant="primary" glow>Most Popular</Badge>
                </div>
              )}

              <h3 className="text-xl font-bold mb-1">{tier.name}</h3>
              <p className={`font-semibold text-lg mb-1 ${tier.highlighted ? "text-primary text-glow" : "text-primary"}`}>
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
                      className="w-4 h-4 text-primary mt-0.5 shrink-0 [filter:drop-shadow(0_0_4px_rgba(0,212,255,0.4))]"
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
                className={`block text-center py-3 rounded-lg font-medium text-sm transition-all focus-glow ${
                  tier.highlighted
                    ? "bg-primary text-background hover:shadow-[var(--glow-md)] active:scale-[0.97]"
                    : "border border-border text-foreground hover:border-primary/50 hover:text-primary hover:shadow-[var(--glow-sm)] gradient-border"
                }`}
              >
                {tier.cta}
              </Link>
            </GlassCard>
          ))}
        </div>
      </div>
    </section>
  );
}
