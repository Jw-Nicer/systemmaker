"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const sidebarLinks = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/case-studies", label: "Case Studies" },
  { href: "/admin/testimonials", label: "Testimonials" },
  { href: "/admin/faqs", label: "FAQs" },
  { href: "/admin/offers", label: "Offers" },
  { href: "/admin/leads", label: "Leads" },
  { href: "/admin/variants", label: "Landing Variants" },
  { href: "/admin/experiments", label: "A/B Tests" },
  { href: "/admin/agent-templates", label: "Agent Templates" },
  { href: "/admin/settings", label: "Settings" },
];

export default function SidebarNav() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  }

  return (
    <nav className="flex-1 p-4 space-y-1">
      {sidebarLinks.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={`block px-4 py-2.5 rounded-lg text-sm transition-colors ${
            isActive(link.href)
              ? "bg-primary/10 text-primary font-medium"
              : "text-muted hover:text-foreground hover:bg-surface-light"
          }`}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
