import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/firebase/auth";

const sidebarLinks = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/case-studies", label: "Case Studies" },
  { href: "/admin/testimonials", label: "Testimonials" },
  { href: "/admin/faqs", label: "FAQs" },
  { href: "/admin/offers", label: "Offers" },
  { href: "/admin/leads", label: "Leads" },
  { href: "/admin/agent-templates", label: "Agent Templates" },
  { href: "/admin/industry-pages", label: "Industry Pages" },
  { href: "/admin/ab-tests", label: "A/B Tests" },
  { href: "/admin/email-sequences", label: "Email Sequences" },
  { href: "/admin/settings", label: "Settings" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();

  if (!user) {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 bg-surface border-r border-border flex flex-col">
        <div className="p-6 border-b border-border">
          <Link href="/admin" className="text-lg font-bold text-primary">
            Nicer Admin
          </Link>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {sidebarLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block px-4 py-2.5 rounded-lg text-sm text-muted hover:text-foreground hover:bg-surface-light transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-border">
          <p className="text-xs text-muted truncate">{user.email}</p>
          <form action="/api/auth/signout" method="post">
            <button
              type="submit"
              className="mt-2 text-xs text-muted hover:text-foreground"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        <header className="h-16 border-b border-border bg-surface/50 backdrop-blur-sm flex items-center px-8">
          <h1 className="text-sm font-medium text-muted">Admin Panel</h1>
        </header>
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
