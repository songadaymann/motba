import { listArtworkOptions } from "@/lib/d1";
import { assertAdminPageAccess } from "@/lib/admin-access";
import { ImageManager } from "./image-manager";

export default async function AdminImagesPage() {
  await assertAdminPageAccess();
  const artworkOptions = await listArtworkOptions();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Image Manager</h1>
      <ImageManager artworks={artworkOptions} />
    </div>
  );
}
