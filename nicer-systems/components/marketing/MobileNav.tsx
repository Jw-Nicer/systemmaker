"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface NavLink {
  href: string;
  label: string;
}

interface MobileNavProps {
  links: NavLink[];
}

export function MobileNav({ links }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const reduced = useReducedMotion();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);

  const close = useCallback(() => setIsOpen(false), []);

  // Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, close]);

  // Scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Focus management
  useEffect(() => {
    if (isOpen) {
      const first = drawerRef.current?.querySelector<HTMLElement>(
        "a[href], button"
      );
      first?.focus();
    } else if (triggerRef.current) {
      triggerRef.current.focus();
    }
  }, [isOpen]);

  // Focus trap
  useEffect(() => {
    if (!isOpen || !drawerRef.current) return;
    const drawer = drawerRef.current;
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const focusable = drawer.querySelectorAll<HTMLElement>(
        'a[href], button, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    drawer.addEventListener("keydown", handler);
    return () => drawer.removeEventListener("keydown", handler);
  }, [isOpen]);

  const handleLinkClick = useCallback(() => {
    close();
  }, [close]);

  const spring = reduced
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 200, damping: 25 };

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls="mobile-nav-drawer"
        aria-label={isOpen ? "Close menu" : "Open menu"}
        className="relative flex h-10 w-10 items-center justify-center rounded-lg md:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#758941] focus-visible:ring-offset-2"
      >
        <div className="flex h-4 w-5 flex-col justify-between">
          <motion.span
            className="block h-0.5 w-full origin-center rounded-full bg-[#1d2318]"
            animate={
              isOpen
                ? { rotate: 45, y: 7, transition: spring }
                : { rotate: 0, y: 0, transition: spring }
            }
          />
          <motion.span
            className="block h-0.5 w-full rounded-full bg-[#1d2318]"
            animate={{ opacity: isOpen ? 0 : 1 }}
            transition={{ duration: 0.1 }}
          />
          <motion.span
            className="block h-0.5 w-full origin-center rounded-full bg-[#1d2318]"
            animate={
              isOpen
                ? { rotate: -45, y: -7, transition: spring }
                : { rotate: 0, y: 0, transition: spring }
            }
          />
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              key="backdrop"
              className="fixed inset-0 z-[60] bg-black/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduced ? 0 : 0.2 }}
              onClick={close}
              aria-hidden="true"
            />

            <motion.nav
              key="drawer"
              ref={drawerRef}
              id="mobile-nav-drawer"
              role="dialog"
              aria-modal="true"
              aria-label="Mobile navigation"
              className="fixed bottom-0 right-0 top-0 z-[70] flex w-72 flex-col bg-[#f4efe5] shadow-[-8px_0_30px_rgba(0,0,0,0.1)]"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={spring}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-end border-b border-[#d9d1c3]/80 p-4">
                <button
                  onClick={close}
                  aria-label="Close menu"
                  className="flex h-10 w-10 items-center justify-center rounded-lg text-[#46523a] hover:text-[#11150d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#758941] focus-visible:ring-offset-2"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <div className="flex flex-1 flex-col gap-1 px-4 py-4">
                {links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={handleLinkClick}
                    className="rounded-xl px-4 py-3 text-base text-[#46523a] transition-colors hover:bg-[#ebe6da] hover:text-[#11150d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#758941]"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>

              <div className="border-t border-[#d9d1c3]/80 p-4">
                <Link
                  href="/contact"
                  onClick={handleLinkClick}
                  className="block w-full rounded-full bg-[#171d13] px-5 py-3 text-center text-sm font-medium text-[#f7f2e8] transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#758941] focus-visible:ring-offset-2"
                >
                  Book a Scoping Call
                </Link>
              </div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
