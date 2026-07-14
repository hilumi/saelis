import { signOut } from "@/app/(auth)/actions";
import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/lib/auth/require-user";

import type { ReactNode } from "react";

/**
 * Protected app shell. Middleware redirects unauthenticated visitors first;
 * this server-side check is the authoritative second layer.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  await requireUser();
  return <AppShell signOutAction={signOut}>{children}</AppShell>;
}
