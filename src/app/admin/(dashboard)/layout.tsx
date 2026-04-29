"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/artists", label: "Artists" },
  { href: "/admin/artworks", label: "Artworks" },
  { href: "/admin/images", label: "Images" },
  { href: "/admin/links", label: "Links" },
];

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-svh">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r border-border bg-muted/30">
        <div className="flex h-full flex-col">
          <div className="border-b border-border px-4 py-4">
            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              &larr; Back to site
            </Link>
            <h2 className="mt-2 text-lg font-bold">MOTBA Admin</h2>
          </div>

          <nav className="flex-1 px-2 py-4 space-y-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "block rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  pathname === item.href
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="border-t border-border px-2 py-4">
            <p className="px-3 text-xs text-muted-foreground">
              Admin access is limited to allowed MOTBA accounts.
            </p>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
