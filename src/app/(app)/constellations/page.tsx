import { createMemoryAction, deleteMemoryAction } from "@/app/(app)/memory-actions";
import { ConstellationsView } from "@/components/constellations/constellations-view";
import { ScreenHeader } from "@/components/layout/screen-header";
import { requireUser } from "@/lib/auth/require-user";
import { listApprovedActiveMemories } from "@/lib/db/queries/memories";
import { createClient } from "@/lib/supabase/server";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Constellations" };

export default async function ConstellationsPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const memories = await listApprovedActiveMemories(supabase, user.id);

  return (
    <div className="mx-auto max-w-2xl">
      <ScreenHeader
        title="Constellations"
        subtitle="What you've chosen to keep, placed quietly among the stars."
      />
      <ConstellationsView
        userSeed={user.id}
        memories={memories.map((memory) => ({
          id: memory.id,
          title: memory.title,
          content: memory.content,
          kind: memory.kind,
          positionSeed: memory.position_seed,
          reason: memory.reason,
          createdAt: memory.created_at,
        }))}
        createAction={createMemoryAction}
        deleteAction={deleteMemoryAction}
      />
    </div>
  );
}
