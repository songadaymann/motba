import { assertAdminPageAccess } from "@/lib/admin-access";
import { listArtistOptions } from "@/lib/d1";
import { SocialManager } from "./social-manager";

export default async function AdminSocialsPage() {
  await assertAdminPageAccess();
  const artists = await listArtistOptions();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Socials Manager</h1>
      <SocialManager artists={artists} />
    </div>
  );
}
