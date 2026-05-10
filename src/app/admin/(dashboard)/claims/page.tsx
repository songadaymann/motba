import { assertAdminPageAccess } from "@/lib/admin-access";
import {
  listAdminArtistMemberships,
  listArtistOptions,
  listUserOptions,
} from "@/lib/d1";
import { ClaimsManager } from "./claims-manager";

export default async function AdminClaimsPage() {
  await assertAdminPageAccess();
  const [artists, users, memberships] = await Promise.all([
    listArtistOptions(),
    listUserOptions(),
    listAdminArtistMemberships(),
  ]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Artist Claims</h1>
        <p className="text-sm text-muted-foreground">
          Attach signed-up users to manually entered artist profiles.
        </p>
      </div>
      <ClaimsManager
        artists={artists}
        users={users}
        initialMemberships={memberships}
      />
    </div>
  );
}
