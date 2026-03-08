"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SIDEBAR_GROUPS } from "@/lib/admin/sidebar-config";

export default function SidebarNav() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  }

  return (
    <nav className="flex-1 space-y-6 px-4 py-6">
      {SIDEBAR_GROUPS.map((group) => (
        <div key={group.title}>
          <p className="px-3 text-[11px] uppercase tracking-[0.2em] text-[#91a08f]">
            {group.title}
          </p>
          <div className="mt-2 space-y-1">
            {group.links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`block rounded-2xl px-4 py-3 text-sm transition-colors ${
                  isActive(link.href)
                    ? "bg-[#edf2e5] text-[#1f2b19] font-medium"
                    : "text-[#d8d2c5] hover:bg-white/8 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}
