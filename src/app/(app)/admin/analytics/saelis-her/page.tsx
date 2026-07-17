import { redirect } from "next/navigation";

import { requireAdminAccess } from "@/lib/auth/admin-access";

/** Saelis Her analytics IS the analytics surface — alias to the overview. */
export default async function SaelisHerAnalyticsPage() {
  await requireAdminAccess("analytics");
  redirect("/admin/analytics");
}
