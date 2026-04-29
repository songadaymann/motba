import { listArtworkOptions } from "@/lib/d1";
import { assertAdminPageAccess } from "@/lib/admin-access";
import { LinkManager } from "./link-manager";

export default async function AdminLinksPage() {
  await assertAdminPageAccess();
  const artworkOptions = await listArtworkOptions();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Links Manager</h1>
      <LinkManager artworks={artworkOptions} />
    </div>
  );
}
