import type { Metadata } from "next";
import { assertAdminPageAccess } from "@/lib/admin-access";

export const metadata: Metadata = {
  title: {
    default: "Admin",
    template: "%s | MOTBA Admin",
  },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await assertAdminPageAccess();
  return <>{children}</>;
}
