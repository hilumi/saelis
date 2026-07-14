import { toggleHorizonStep } from "@/app/(app)/actions";
import { HorizonList, type HorizonListItem } from "@/components/horizon/horizon-list";
import { ScreenHeader } from "@/components/layout/screen-header";
import { getOptionalUser } from "@/lib/auth/require-user";
import { listHorizonSteps } from "@/lib/db/queries/horizon";
import { createClient } from "@/lib/supabase/server";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Horizon" };

export default async function HorizonPage() {
  let steps: HorizonListItem[] = [];

  try {
    const user = await getOptionalUser();
    if (user) {
      const supabase = await createClient();
      const rows = await listHorizonSteps(supabase, user.id);
      steps = rows.map((row) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        estimatedMinutes: row.estimated_minutes,
        completed: row.completed,
      }));
    }
  } catch {
    // Database not reachable (e.g. migrations not yet run) — show the empty state.
    steps = [];
  }

  return (
    <div className="mx-auto max-w-2xl">
      <ScreenHeader
        title="Horizon"
        subtitle="One manageable step at a time. Never a backlog, never a scoreboard."
      />
      <HorizonList steps={steps} toggleAction={toggleHorizonStep} />
    </div>
  );
}
