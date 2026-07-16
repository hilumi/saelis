import type { SupabaseClient } from "@supabase/supabase-js";

import type { AdaptivePreference, PatternHypothesis, PatternTheme } from "@/lib/core/types";
import type { Database, Tables } from "@/lib/supabase/types";

type Client = SupabaseClient<Database>;

/**
 * Adaptation data access. All reads/writes go through the request-scoped,
 * RLS-enforced client. Confidence and evidence counts can only RISE through
 * the security-definer functions (record_adaptive_observation,
 * record_pattern_evidence); every ordinary update is limited by database
 * triggers to status changes and confidence decreases. Failures in the
 * adaptation layer are calm and content-free — and callers treat adaptation
 * as strictly optional: it must never break a conversation.
 */

function toAdaptivePreference(row: Tables<"adaptive_preferences">): AdaptivePreference {
  return {
    id: row.id,
    key: row.key as AdaptivePreference["key"],
    value: row.value,
    confidence: Number(row.confidence),
    evidenceCount: row.evidence_count,
    status: row.status,
    firstObservedAt: row.first_observed_at,
    lastObservedAt: row.last_observed_at,
    expiresAt: row.expires_at,
  };
}

export async function listAdaptivePreferences(
  supabase: Client,
  userId: string,
): Promise<AdaptivePreference[]> {
  const { data, error } = await supabase
    .from("adaptive_preferences")
    .select("*")
    .eq("user_id", userId)
    .order("last_observed_at", { ascending: false })
    .limit(50);
  if (error) throw new Error("Could not load communication preferences.");
  return (data ?? []).map(toAdaptivePreference);
}

/** Record one observation via the policy-controlled database function. */
export async function recordAdaptiveObservation(
  supabase: Client,
  key: string,
  value: Record<string, string | number | boolean>,
  explicit: boolean,
): Promise<void> {
  const { error } = await supabase.rpc("record_adaptive_observation", {
    p_key: key,
    p_value: value,
    p_explicit: explicit,
  });
  if (error) throw new Error("Could not note that preference.");
}

/** User controls: keep (activate), pause, or reset a preference. */
export async function setAdaptivePreferenceStatus(
  supabase: Client,
  userId: string,
  preferenceId: string,
  status: "active" | "paused" | "reset",
): Promise<void> {
  const { error } = await supabase
    .from("adaptive_preferences")
    .update({ status })
    .eq("id", preferenceId)
    .eq("user_id", userId);
  if (error) throw new Error("Could not update that preference.");
}

/** Correction: lowers confidence through the bounded database function. */
export async function recordAdaptationCorrection(
  supabase: Client,
  preferenceId: string,
): Promise<void> {
  const { error } = await supabase.rpc("record_adaptation_correction", { p_id: preferenceId });
  if (error) throw new Error("Could not record that correction.");
}

export async function deleteAllAdaptationData(supabase: Client, userId: string): Promise<void> {
  const preferences = await supabase.from("adaptive_preferences").delete().eq("user_id", userId);
  const evidence = await supabase.from("pattern_evidence").delete().eq("user_id", userId);
  const hypotheses = await supabase.from("pattern_hypotheses").delete().eq("user_id", userId);
  if (preferences.error || evidence.error || hypotheses.error) {
    throw new Error("Could not clear adaptation data.");
  }
}

// ---------------------------------------------------------------------------
// Pattern hypotheses
// ---------------------------------------------------------------------------

function toPatternHypothesis(
  row: Tables<"pattern_hypotheses">,
  evidence: Tables<"pattern_evidence">[] = [],
): PatternHypothesis {
  return {
    id: row.id,
    theme: row.theme as PatternTheme,
    observation: row.observation,
    uncertaintyStatement: row.uncertainty_statement,
    confidence: Number(row.confidence),
    evidenceCount: row.evidence_count,
    crossDomainCount: row.cross_domain_count,
    status: row.status,
    firstObservedAt: row.first_observed_at,
    lastObservedAt: row.last_observed_at,
    evidence: evidence.map((reference) => ({
      id: reference.id,
      sourceType: reference.source_type as PatternHypothesis["evidence"][number]["sourceType"],
      occurredAt: reference.occurred_at,
      summary: reference.evidence_summary,
    })),
  };
}

export async function listPatternHypotheses(
  supabase: Client,
  userId: string,
): Promise<PatternHypothesis[]> {
  const [hypothesesResult, evidenceResult] = await Promise.all([
    supabase
      .from("pattern_hypotheses")
      .select("*")
      .eq("user_id", userId)
      .order("last_observed_at", { ascending: false })
      .limit(30),
    supabase
      .from("pattern_evidence")
      .select("*")
      .eq("user_id", userId)
      .order("occurred_at", { ascending: false })
      .limit(200),
  ]);
  if (hypothesesResult.error || evidenceResult.error) {
    throw new Error("Could not load pattern observations.");
  }
  const evidenceByHypothesis = new Map<string, Tables<"pattern_evidence">[]>();
  for (const reference of evidenceResult.data ?? []) {
    const list = evidenceByHypothesis.get(reference.hypothesis_id) ?? [];
    list.push(reference);
    evidenceByHypothesis.set(reference.hypothesis_id, list);
  }
  return (hypothesesResult.data ?? []).map((row) =>
    toPatternHypothesis(row, evidenceByHypothesis.get(row.id) ?? []),
  );
}

/** Record screened pattern evidence via the policy-controlled function. */
export async function recordPatternEvidence(
  supabase: Client,
  input: {
    theme: string;
    observation: string;
    uncertainty: string;
    sourceType: string;
    summary: string;
    crossDomain: boolean;
  },
): Promise<void> {
  const { error } = await supabase.rpc("record_pattern_evidence", {
    p_theme: input.theme,
    p_observation: input.observation,
    p_uncertainty: input.uncertainty,
    p_source_type: input.sourceType,
    p_summary: input.summary,
    p_cross_domain: input.crossDomain,
  });
  if (error) throw new Error("Could not note that observation.");
}

/** User decisions from /insights: explore, dismiss, or reject. */
export async function setPatternHypothesisStatus(
  supabase: Client,
  userId: string,
  hypothesisId: string,
  status: "reviewable" | "accepted" | "rejected" | "expired",
  surfaced = false,
): Promise<void> {
  const values: {
    status: "reviewable" | "accepted" | "rejected" | "expired";
    surfaced_at?: string;
  } = { status };
  if (surfaced) values.surfaced_at = new Date().toISOString();
  const { error } = await supabase
    .from("pattern_hypotheses")
    .update(values)
    .eq("id", hypothesisId)
    .eq("user_id", userId);
  if (error) throw new Error("Could not update that observation.");
}

// ---------------------------------------------------------------------------
// Founder aggregates (counts only; authorization enforced in the database)
// ---------------------------------------------------------------------------

export async function getAdaptationAggregateCounts(
  supabase: Client,
): Promise<Array<{ record_kind: string; status: string; occurrences: number }>> {
  const { data, error } = await supabase.rpc("adaptation_aggregate_counts");
  if (error) throw new Error("Aggregates unavailable.");
  return data ?? [];
}
