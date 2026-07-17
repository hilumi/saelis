import { redirect } from "next/navigation";

import { requireAdminAccess } from "@/lib/auth/admin-access";

/** /admin — server-authorized entry; unauthorized visitors receive a 404. */
export default async function AdminIndexPage() {
  await requireAdminAccess("analytics");
  redirect("/admin/analytics");
}
