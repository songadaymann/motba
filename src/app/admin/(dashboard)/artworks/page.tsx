import { listAdminArtworks, listArtistOptions } from "@/lib/d1";
import { assertAdminPageAccess } from "@/lib/admin-access";
import { ArtworksTable } from "./artworks-table";

export default async function AdminArtworksPage() {
  await assertAdminPageAccess();
  const [artworks, artists] = await Promise.all([
    listAdminArtworks(),
    listArtistOptions(),
  ]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Artworks</h1>
          <p className="text-sm text-muted-foreground">
            Click any cell to edit. Changes save automatically.
          </p>
        </div>
      </div>
      <ArtworksTable
        artworks={artworks}
        artists={artists}
      />
    </div>
  );
}
