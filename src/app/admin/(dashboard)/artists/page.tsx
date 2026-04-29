import { listAdminArtists } from "@/lib/d1";
import { assertAdminPageAccess } from "@/lib/admin-access";
import { ArtistsTable } from "./artists-table";

export default async function AdminArtistsPage() {
  await assertAdminPageAccess();
  const artists = await listAdminArtists();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Artists</h1>
          <p className="text-sm text-muted-foreground">
            Click any cell to edit. Changes save automatically.
          </p>
        </div>
      </div>
      <ArtistsTable artists={artists} />
    </div>
  );
}
