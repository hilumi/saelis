import { notFound } from "next/navigation";

import { ScreenHeader } from "@/components/layout/screen-header";
import { GlassSurface } from "@/components/ui/glass-surface";
import { getOptionalUser } from "@/lib/auth/require-user";
import { hasFounderRole } from "@/lib/db/queries/roles";
import {
  getStewardshipEventCounts,
  getStewardshipMemoryCounts,
} from "@/lib/db/queries/stewardship";
import { isOpenAIConfigured } from "@/lib/ai/openai-client";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { APP_VERSION } from "@/lib/version";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Founder Console" };

const EVENT_LABELS: Record<string, string> = {
  companion_request_succeeded: "Companion responses",
  companion_request_failed: "Companion failures",
  companion_retry: "Provider retries",
  safety_urgent_override: "Urgent safety overrides",
  safety_support_detected: "Support-level safety notes",
  memory_proposal_shown: "Memory proposals shown",
  memory_proposal_accepted: "Memory proposals accepted",
  memory_proposal_edited: "Proposals edited before keeping",
  memory_proposal_rejected: "Memory proposals declined",
  memory_deleted: "Memories removed",
  horizon_step_added: "Horizon steps added",
  response_feedback_positive: "Marked helpful",
  response_feedback_negative: "Marked not quite",
};

/**
 * Founder Console — stewardship without surveillance.
 * Authorization is verified server-side against app_roles (RLS-protected;
 * roles cannot be self-assigned). Unauthorized visitors receive a 404.
 * Every number below is an aggregate count; no user content, names, emails,
 * or identifiers ever reach this page.
 */
export default async function FounderPage() {
  const user = await getOptionalUser();
  if (!user) notFound();

  const supabase = await createClient();
  const isFounder = await hasFounderRole(supabase, user.id);
  if (!isFounder) notFound();

  let eventCounts: Array<{ event_type: string; occurrences: number }> = [];
  let memoryCounts: Array<{ kind: string; status: string; occurrences: number }> = [];
  let aggregatesAvailable = true;
  try {
    [eventCounts, memoryCounts] = await Promise.all([
      getStewardshipEventCounts(supabase),
      getStewardshipMemoryCounts(supabase),
    ]);
  } catch {
    aggregatesAvailable = false;
  }

  const count = (type: string) =>
    eventCounts.find((event) => event.event_type === type)?.occurrences ?? 0;
  const memoryCount = (kind: string) =>
    memoryCounts
      .filter((row) => row.kind === kind && row.status === "active")
      .reduce((sum, row) => sum + row.occurrences, 0);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <ScreenHeader
        title="Founder Console"
        subtitle="Steward the experience without intruding on the people who trust it."
      />

      <GlassSurface>
        <h2 className="mb-2 font-semibold text-ink">Application health</h2>
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <dt className="text-ink-soft">Version</dt>
          <dd className="text-ink">v{APP_VERSION}</dd>
          <dt className="text-ink-soft">Companion provider</dt>
          <dd className="text-ink">
            {(process.env.COMPANION_PROVIDER ?? "mock") === "openai" ? "openai" : "mock"}
          </dd>
          <dt className="text-ink-soft">Supabase</dt>
          <dd className="text-ink">{hasSupabaseEnv() ? "configured" : "not configured"}</dd>
          <dt className="text-ink-soft">OpenAI</dt>
          <dd className="text-ink">{isOpenAIConfigured() ? "configured" : "not configured"}</dd>
          <dt className="text-ink-soft">Streaming</dt>
          <dd className="text-ink">enabled</dd>
          <dt className="text-ink-soft">Feature flags</dt>
          <dd className="text-ink">living-sky, constellations, streaming</dd>
        </dl>
      </GlassSurface>

      {!aggregatesAvailable ? (
        <GlassSurface>
          <p className="text-ink-soft">
            Aggregate telemetry isn&apos;t available yet — run migration 00004 and check back.
            Nothing is wrong with the user experience.
          </p>
        </GlassSurface>
      ) : (
        <>
          <GlassSurface>
            <h2 className="mb-2 font-semibold text-ink">
              Quality & safety (30 days, aggregates only)
            </h2>
            <ul className="flex flex-col gap-1 text-sm text-ink-soft">
              {Object.entries(EVENT_LABELS).map(([type, label]) => (
                <li key={type} className="flex justify-between">
                  <span>{label}</span>
                  <span className="tabular-nums text-ink">{count(type)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-ink-muted">
              Counts only. No messages, no memory content, no names, no identifiers, no per-person
              drill-down — by design and by database policy.
            </p>
          </GlassSurface>

          <GlassSurface>
            <h2 className="mb-2 font-semibold text-ink">Memory stewardship</h2>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <dt className="text-ink-soft">Active Constellations</dt>
              <dd className="tabular-nums text-ink">{memoryCount("constellation")}</dd>
              <dt className="text-ink-soft">Active North Stars</dt>
              <dd className="tabular-nums text-ink">{memoryCount("north-star")}</dd>
            </dl>
          </GlassSurface>
        </>
      )}

      <GlassSurface>
        <h2 className="mb-2 font-semibold text-ink">Releases</h2>
        <p className="text-sm text-ink-soft">
          v0.5 Constellations & Stewardship — see CHANGELOG.md and ROADMAP.md in the repository.
          Test and build status live in the local quality checks (npm test, npm run build).
        </p>
      </GlassSurface>
    </div>
  );
}
