/**
 * Row shapes matching supabase/migrations exactly (snake_case).
 *
 * TEMPORARY TYPE BOUNDARY — replace with generated types once a live Supabase
 * project exists:
 *   npx supabase gen types typescript --project-id <project-id> --schema public \
 *     > src/lib/supabase/generated.types.ts
 * then update src/lib/supabase/types.ts to build `Database` from that file.
 * See README "Generating database types".
 */
import type { ENERGIES, MOODS, SUPPORT_NEEDS } from "@/lib/constants";
import type { MemoryKind } from "@/types/companion";
import type {
  EncouragementStyle,
  FaithPreference,
  HumorLevel,
  MemorySource,
  MemoryStatus,
  PlanningStyle,
  ResponseLength,
  SupportMode,
  SupportPreference,
  TonePreference,
  TurnRole,
} from "@/types/companion";

export type ProfileRow = {
  id: string;
  preferred_name: string | null;
  timezone: string | null;
  /** Set once when onboarding completes (or is skipped); never shown again. */
  onboarded_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CompanionProfileRow = {
  user_id: string;
  tone_preference: TonePreference;
  response_length: ResponseLength;
  default_support_preference: SupportPreference;
  humor_level: HumorLevel;
  faith_preference: FaithPreference;
  planning_style: PlanningStyle;
  encouragement_style: EncouragementStyle;
  adaptive_learning_enabled: boolean;
  created_at: string;
  updated_at: string;
};

export type ArrivalRow = {
  id: string;
  user_id: string;
  mood: (typeof MOODS)[number];
  energy: (typeof ENERGIES)[number];
  support_need: (typeof SUPPORT_NEEDS)[number];
  message: string | null;
  include_faith_reflection: boolean;
  created_at: string;
};

export type ConversationRow = {
  id: string;
  user_id: string;
  title: string | null;
  status: "active" | "completed" | "archived";
  created_at: string;
  updated_at: string;
};

export type ConversationTurnRow = {
  id: string;
  conversation_id: string;
  user_id: string;
  role: TurnRole;
  content: string;
  support_mode: SupportMode | null;
  closing_line: string | null;
  provider_response_id: string | null;
  created_at: string;
};

export type HorizonStepRow = {
  id: string;
  user_id: string;
  conversation_id: string | null;
  arrival_id: string | null;
  title: string;
  description: string;
  estimated_minutes: number;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CompanionMemoryRow = {
  id: string;
  user_id: string;
  category: string;
  content: string;
  kind: MemoryKind;
  title: string | null;
  reason: string | null;
  position_seed: string | null;
  last_used_at: string | null;
  use_count: number;
  source: MemorySource;
  status: MemoryStatus;
  user_approved: boolean;
  created_at: string;
  updated_at: string;
};

export type UserPrivacySettingsRow = {
  user_id: string;
  save_conversation_history: boolean;
  allow_companion_memory: boolean;
  allow_product_analytics: boolean;
  created_at: string;
  updated_at: string;
};

export type AppRoleRow = {
  user_id: string;
  role: "founder" | "admin" | "support";
  created_at: string;
};

export type AdaptivePreferenceRow = {
  id: string;
  user_id: string;
  key: string;
  value: Record<string, string | number | boolean>;
  confidence: number;
  evidence_count: number;
  status: "observed" | "active" | "paused" | "reset" | "expired";
  first_observed_at: string;
  last_observed_at: string;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PatternHypothesisRow = {
  id: string;
  user_id: string;
  theme: string;
  observation: string;
  uncertainty_statement: string;
  confidence: number;
  evidence_count: number;
  cross_domain_count: number;
  status: "working" | "reviewable" | "accepted" | "rejected" | "expired";
  first_observed_at: string;
  last_observed_at: string;
  surfaced_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PatternEvidenceRow = {
  id: string;
  hypothesis_id: string;
  user_id: string;
  source_type: string;
  source_id: string | null;
  occurred_at: string;
  evidence_summary: string;
  created_at: string;
};

export type StewardshipEventRow = {
  id: string;
  user_id: string;
  event_type: string;
  provider: string | null;
  model: string | null;
  latency_bucket: string | null;
  support_mode: string | null;
  safety_level: string | null;
  error_category: string | null;
  memory_kind: string | null;
  feedback_category: string | null;
  app_version: string | null;
  created_at: string;
};
