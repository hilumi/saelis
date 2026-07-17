import { PathwayManagement, type EnrollmentSummary } from "@/components/her/pathway-management";
import { ScreenHeader } from "@/components/layout/screen-header";
import { requireUser } from "@/lib/auth/require-user";
import { listEnrollments } from "@/lib/db/queries/wellness/enrollments";
import { createClient } from "@/lib/supabase/server";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Saelis Her — Pathways" };

export default async function HerPathwaysPage() {
  const user = await requireUser();
  const supabase = await createClient();

  let enrollments: EnrollmentSummary[] = [];
  try {
    const rows = await listEnrollments(supabase, user.id);
    // Latest enrollment per pathway drives the management card.
    const byPathway = new Map<string, (typeof rows)[number]>();
    for (const row of rows) byPathway.set(row.pathway_key, row);
    enrollments = [...byPathway.values()].map((row) => ({
      id: row.id,
      pathwayKey: row.pathway_key,
      status: row.status,
      startedOn: row.started_on,
    }));
  } catch {
    enrollments = [];
  }

  return (
    <div className="mx-auto max-w-2xl">
      <ScreenHeader
        title="Pathways"
        subtitle="Choose what fits this season. Pausing or setting aside never deletes anything."
      />
      <PathwayManagement enrollments={enrollments} />
    </div>
  );
}
