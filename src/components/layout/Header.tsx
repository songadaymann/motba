"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Clock3, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ClockO } from "@/components/ClockO";
import { useState } from "react";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/timeline", label: "Timeline" },
  { href: "/artists", label: "Artists" },
  { href: "/start", label: "Start" },
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
          className="flex min-w-0 items-center gap-3 text-[var(--riso-ink)]"
          style={{ fontFamily: "'Arial Black', 'Impact', sans-serif" }}
        >
          <span className="flex shrink-0 items-center gap-[2px] text-[20px] font-black">
            <span>M</span>
            <ClockO size={22} />
            <span>TBA</span>
          </span>
          <span className="hidden truncate text-[10px] font-black lowercase tracking-[0.08em] text-[var(--riso-ink)]/65 min-[360px]:inline">
            museum of time based art
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-3 md:flex">
          {NAV_LINKS.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "time-nav-link text-xs font-black uppercase tracking-[0.1em] transition-colors",
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

        {/* Mobile timepiece menu */}
        <button
          className="time-menu-button inline-flex items-center justify-center p-2 text-[var(--riso-ink)] md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? (
            <X className="size-5" strokeWidth={2.5} />
          ) : (
            <Clock3 className="size-5" strokeWidth={2.5} />
          )}
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
                  "time-nav-link block px-3 py-2 text-xs font-black uppercase tracking-[0.1em]",
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
