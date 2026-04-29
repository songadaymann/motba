"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ClockO } from "@/components/ClockO";
import { useState } from "react";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/timeline", label: "Timeline" },
  { href: "/artists", label: "Artists" },
  { href: "/submit", label: "Submit" },
  { href: "/account", label: "Account" },
];

export function Header() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b-[3px] border-[var(--riso-ink)] bg-[var(--riso-sage)]">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-[2px] text-[20px] font-black text-[var(--riso-ink)]"
          style={{ fontFamily: "'Arial Black', 'Impact', sans-serif" }}
        >
          <span>M</span>
          <ClockO size={22} />
          <span>TBA</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-4 md:flex">
          {NAV_LINKS.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "text-xs font-black uppercase tracking-[0.1em] transition-colors",
                  isActive
                    ? "text-[var(--riso-ink)] underline decoration-[3px] underline-offset-4"
                    : "text-[var(--riso-ink)]/70 hover:text-[var(--riso-ink)]"
                )}
                style={{ fontFamily: "'Arial Black', 'Impact', sans-serif" }}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Mobile hamburger */}
        <button
          className="inline-flex items-center justify-center p-2 text-[var(--riso-ink)] md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2.5}
            stroke="currentColor"
          >
            {mobileOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
              />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <nav className="border-t-[2px] border-[var(--riso-ink)] px-4 pb-4 md:hidden">
          {NAV_LINKS.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "block px-3 py-2 text-xs font-black uppercase tracking-[0.1em]",
                  isActive
                    ? "text-[var(--riso-ink)] underline decoration-[3px] underline-offset-4"
                    : "text-[var(--riso-ink)]/70"
                )}
                style={{ fontFamily: "'Arial Black', 'Impact', sans-serif" }}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      )}
    </header>
  );
}
