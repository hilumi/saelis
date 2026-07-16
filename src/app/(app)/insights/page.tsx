import { decidePatternInsight } from "@/app/(app)/adaptation-actions";
import { InsightsView } from "@/components/insights/insights-view";
import { ScreenHeader } from "@/components/layout/screen-header";
import { requireUser } from "@/lib/auth/require-user";
import { selectReviewableHypotheses } from "@/lib/core";
import { CORE_PREVIEWS, previewPatternHypotheses } from "@/lib/core/preview-fixtures";
import { listPatternHypotheses } from "@/lib/db/queries/adaptation";
import { createClient } from "@/lib/supabase/server";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Things you may not have noticed" };

/**
 * /insights — "Things you may not have noticed".
 *
 * Only mature, reviewable hypotheses appear: repeated evidence, across
 * different kinds of moments, over multiple days. Never one conversation's
 * guess, never a diagnosis, never a conclusion. Everything can be declined
 * or switched off, and the evidence is always inspectable.
 */
export default async function InsightsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const supabase = await createClient();

  // DEVELOPMENT-ONLY preview states (fictional, never persisted).
  let preview: string | undefined;
  if (process.env.NODE_ENV !== "production" && searchParams) {
    const params = await searchParams;
    const value = params.preview;
    if (typeof value === "string" && CORE_PREVIEWS.has(value)) preview = value;
  }

  const hypotheses = preview
    ? previewPatternHypotheses(preview)
    : await listPatternHypotheses(supabase, user.id).catch(() => []);

  const reviewable = selectReviewableHypotheses(hypotheses);

  return (
    <div className="mx-auto max-w-xl">
      <ScreenHeader
        title="Things you may not have noticed"
        subtitle="Quiet observations that kept returning. Tentative by design — you decide what they mean, and whether they mean anything at all."
      />
      <InsightsView
        hypotheses={reviewable}
        action={preview ? undefined : decidePatternInsight}
        previewMode={Boolean(preview)}
      />
    </div>
  );
}
