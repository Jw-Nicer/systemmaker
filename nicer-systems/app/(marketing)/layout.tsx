import Link from "next/link";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/case-studies", label: "Proof of Work" },
  { href: "/contact", label: "Contact" },
];

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border bg-surface/80 backdrop-blur-sm sticky top-0 z-50">
        <nav className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-primary">
            Nicer Systems
          </Link>
          <div className="flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-muted hover:text-foreground transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/contact"
              className="text-sm font-medium px-4 py-2 rounded-lg bg-primary text-background hover:opacity-90 transition-opacity"
            >
              Book a Call
            </Link>
          </div>
        </nav>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border bg-surface py-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted">
              &copy; {new Date().getFullYear()} Nicer Systems. All rights reserved.
            </p>
            <div className="flex gap-6">
              <Link href="/privacy" className="text-sm text-muted hover:text-foreground">
                Privacy
              </Link>
              <Link href="/terms" className="text-sm text-muted hover:text-foreground">
                Terms
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
