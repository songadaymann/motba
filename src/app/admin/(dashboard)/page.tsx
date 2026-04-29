import { getAdminCounts } from "@/lib/d1";
import { assertAdminPageAccess } from "@/lib/admin-access";
import Link from "next/link";

export default async function AdminDashboardPage() {
  await assertAdminPageAccess();
  const { artists: artistCount, artworks: artworkCount } = await getAdminCounts();

  return (
    <div>
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="mt-1 text-muted-foreground">
        Manage artists and artworks for MOTBA.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/admin/artists"
          className="rounded-lg border border-border p-6 hover:bg-accent transition-colors"
        >
          <p className="text-3xl font-bold">{artistCount}</p>
          <p className="text-muted-foreground">Artists</p>
        </Link>
        <Link
          href="/admin/artworks"
          className="rounded-lg border border-border p-6 hover:bg-accent transition-colors"
        >
          <p className="text-3xl font-bold">{artworkCount}</p>
          <p className="text-muted-foreground">Artworks</p>
        </Link>
      </div>
    </div>
  );
}
