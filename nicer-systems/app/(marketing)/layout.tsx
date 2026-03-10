import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import {
  AnalyticsConsentBanner,
  PrivacyPreferencesButton,
} from "@/components/ui/AnalyticsConsentControls";
import { MobileNav } from "@/components/marketing/MobileNav";
import { getPublishedCaseStudies } from "@/lib/firestore/case-studies";

export interface NavLink {
  href: string;
  label: string;
  badge?: string;
}

function buildNavLinks(hasCaseStudies: boolean): NavLink[] {
  return [
    { href: "/#see-it-work", label: "Demo" },
    { href: "/#how-it-works", label: "How it works" },
    { href: "/#pricing", label: "Pricing" },
    {
      href: "/case-studies",
      label: "Case Studies",
      ...(!hasCaseStudies && { badge: "Soon" }),
    },
  ];
}

const footerColumns = [
  {
    title: "Company",
    links: [
      { label: "Contact", href: "/contact" },
      { label: "Case Studies", href: "/case-studies" },
      { label: "FAQ", href: "/#faq" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
    ],
  },
];

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const caseStudies = await getPublishedCaseStudies();
  const navLinks = buildNavLinks(caseStudies.length > 0);

  return (
    <div className="min-h-screen bg-[var(--theme-page-background,var(--cream-bg))] text-[var(--text-heading)]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-[var(--green-dark)] focus:px-4 focus:py-2 focus:text-sm focus:text-[var(--cream-warm)] focus:outline-none focus:ring-2 focus:ring-[var(--green-accent)]"
      >
        Skip to main content
      </a>

      <header className="sticky top-0 z-50 border-b border-[var(--border-light)]/80 bg-[var(--cream-bg)]/95 backdrop-blur-md">
        <nav
          aria-label="Main navigation"
          className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:h-18 sm:px-6 lg:px-10"
        >
          <div className="sm:hidden">
            <Logo size="sm" variant="light" />
          </div>
          <div className="hidden sm:block">
            <Logo size="md" variant="light" />
          </div>

          <div className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm text-[var(--text-accent)] transition-colors hover:text-[var(--text-heading)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--green-accent)] focus-visible:ring-offset-2 focus-visible:rounded-sm"
              >
                {link.label}
                {link.badge && (
                  <span className="ml-1.5 inline-block rounded-full bg-[var(--tag-warm)] px-2 py-0.5 text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                    {link.badge}
                  </span>
                )}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <MobileNav links={navLinks} />
            <Link
              href="/contact"
              className="shrink-0 rounded-full bg-[var(--green-dark)] px-3 py-2 text-xs font-medium text-[var(--cream-warm)] shadow-[var(--shadow-card)] transition-all duration-300 hover:scale-[1.02] hover:shadow-[var(--shadow-card-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--green-accent)] focus-visible:ring-offset-2 sm:px-5 sm:py-2.5 sm:text-sm"
            >
              <span className="sm:hidden">Book Call</span>
              <span className="hidden sm:inline">Book a Scoping Call</span>
            </Link>
          </div>
        </nav>
      </header>

      <main id="main-content">{children}</main>

      <footer className="border-t border-[#224131]/20 bg-[linear-gradient(180deg,#163122,#193126)] text-[#e7e0cf]" role="contentinfo">
        <div className="mx-auto max-w-7xl px-6 py-14 lg:px-10">
          <div className="grid gap-10 pt-2 md:grid-cols-[1.5fr_1fr_1fr]">
            <div>
              <Logo size="lg" variant="dark" className="mb-4" />
              <p className="mt-3 max-w-sm text-sm leading-6 text-[#c2cac0]">
                Automation and visibility for operations teams. We map your
                workflows, build dashboards, and automate the repetitive
                work — so you can focus on the business.
              </p>
              <p className="mt-4 text-xs text-[#a4b1a0]">
                Tell us the problem. We&apos;ll build the system.
              </p>
              <Link
                href="/#see-it-work"
                className="mt-5 inline-flex rounded-full bg-[#f2eadb] px-5 py-2.5 text-sm font-medium text-[#132015] transition-all duration-300 hover:scale-[1.02]"
              >
                Get Started
              </Link>
            </div>

            {footerColumns.map((column) => (
              <div key={column.title}>
                <p className="text-xs uppercase tracking-[0.16em] text-[#9fae9d]">
                  {column.title}
                </p>
                <div className="mt-4 space-y-3">
                  {column.links.map((link) => (
                    <Link key={link.label} href={link.href} className="block text-sm text-[#f0e9db] transition-colors hover:text-white">
                      {link.label}
                    </Link>
                  ))}
                  {column.title === "Legal" ? <PrivacyPreferencesButton /> : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      </footer>
      <AnalyticsConsentBanner />
    </div>
  );
}
