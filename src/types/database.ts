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
