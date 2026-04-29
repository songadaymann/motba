import Link from "next/link";
import { SITE_CONFIG } from "@/lib/constants";
import { ClockO } from "@/components/ClockO";

export function Footer() {
  return (
    <footer className="border-t-[3px] border-[var(--riso-ink)]">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-3">
            <span
              className="flex items-center gap-[2px] text-sm font-black text-[var(--riso-ink)]"
              style={{ fontFamily: "'Arial Black', 'Impact', sans-serif" }}
            >
              M<ClockO size={14} />TBA
            </span>
            <span
              className="text-xs text-[var(--riso-muted)] font-bold"
              style={{ fontFamily: "'Courier New', monospace" }}
            >
              {SITE_CONFIG.description}
            </span>
          </div>
          <nav className="flex gap-4">
            {[
              { href: "/artists", label: "Artists" },
              { href: "/timeline", label: "Timeline" },
              { href: "/submit", label: "Submit" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-[11px] font-black uppercase tracking-[0.1em] text-[var(--riso-ink)]/60 hover:text-[var(--riso-ink)] transition-colors"
                style={{ fontFamily: "'Arial Black', 'Impact', sans-serif" }}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
