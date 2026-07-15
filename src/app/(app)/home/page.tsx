import { HomeView } from "@/components/home/home-view";
import { requireUser } from "@/lib/auth/require-user";
import { loadHomeData } from "@/lib/home/loader";
import { createClient } from "@/lib/supabase/server";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Home" };

const PREVIEWS = new Set([
  "first-visit",
  "returning",
  "horizon",
  "constellations",
  "north-star",
  "empty",
]);

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const supabase = await createClient();
  const data = await loadHomeData(supabase, user.id);

  // DEVELOPMENT-ONLY preview states (fictional, never persisted).
  let preview: string | undefined;
  if (process.env.NODE_ENV === "development") {
    const params = await searchParams;
    const value = params.preview;
    if (typeof value === "string" && PREVIEWS.has(value)) preview = value;
  }

  return <HomeView data={data} preview={preview} />;
}
