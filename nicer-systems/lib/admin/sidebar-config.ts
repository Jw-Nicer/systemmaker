export interface SidebarLink {
  href: string;
  label: string;
}

export interface SidebarGroup {
  title: string;
  links: SidebarLink[];
}

export const SIDEBAR_GROUPS: SidebarGroup[] = [
  {
    title: "Overview",
    links: [
      { href: "/admin", label: "Dashboard" },
      { href: "/admin/leads", label: "Leads" },
    ],
  },
  {
    title: "Content",
    links: [
      { href: "/admin/case-studies", label: "Case Studies" },
      { href: "/admin/testimonials", label: "Testimonials" },
      { href: "/admin/faqs", label: "FAQs" },
      { href: "/admin/offers", label: "Offers" },
    ],
  },
  {
    title: "Growth",
    links: [
      { href: "/admin/variants", label: "Landing Variants" },
      { href: "/admin/experiments", label: "A/B Tests" },
    ],
  },
  {
    title: "System",
    links: [
      { href: "/admin/agent-templates", label: "Agent Templates" },
      { href: "/admin/settings", label: "Settings" },
    ],
  },
];
