import { deleteAllMemoriesAction } from "@/app/(app)/actions";
import {
  deleteMemoryAction,
  exportMemoriesAction,
  updateMemoryAction,
} from "@/app/(app)/memory-actions";
import { ScreenHeader } from "@/components/layout/screen-header";
import { MemoryCenter } from "@/components/memories/memory-center";
import { requireUser } from "@/lib/auth/require-user";
import { listReviewableMemories } from "@/lib/db/queries/memories";
import { createClient } from "@/lib/supabase/server";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "How Saelis remembers" };

export default async function MemoriesSettingsPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const memories = await listReviewableMemories(supabase, user.id);

  return (
    <div className="mx-auto max-w-2xl">
      <ScreenHeader
        title="How Saelis remembers"
        subtitle="Every memory here exists because you chose to keep it."
      />
      <MemoryCenter
        memories={memories.map((memory) => ({
          id: memory.id,
          kind: memory.kind,
          title: memory.title,
          content: memory.content,
          reason: memory.reason,
          createdAt: memory.created_at,
          updatedAt: memory.updated_at,
          active: memory.status === "active",
        }))}
        updateAction={updateMemoryAction}
        deleteAction={deleteMemoryAction}
        clearAllAction={deleteAllMemoriesAction}
        exportAction={exportMemoriesAction}
      />
    </div>
  );
}
