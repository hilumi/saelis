import type {
  MEMORY_KINDS,
  ENCOURAGEMENT_STYLES,
  FAITH_PREFERENCES,
  HUMOR_LEVELS,
  MEMORY_SOURCES,
  MEMORY_STATUSES,
  PLANNING_STYLES,
  RESPONSE_LENGTHS,
  SUPPORT_MODES,
  SUPPORT_PREFERENCES,
  TONE_PREFERENCES,
  TURN_ROLES,
} from "@/lib/constants";

export type SupportMode = (typeof SUPPORT_MODES)[number];
export type TurnRole = (typeof TURN_ROLES)[number];

export type TonePreference = (typeof TONE_PREFERENCES)[number];
export type ResponseLength = (typeof RESPONSE_LENGTHS)[number];
export type SupportPreference = (typeof SUPPORT_PREFERENCES)[number];
export type HumorLevel = (typeof HUMOR_LEVELS)[number];
export type FaithPreference = (typeof FAITH_PREFERENCES)[number];
export type PlanningStyle = (typeof PLANNING_STYLES)[number];
export type EncouragementStyle = (typeof ENCOURAGEMENT_STYLES)[number];

export type MemoryKind = (typeof MEMORY_KINDS)[number];
export type MemoryStatus = (typeof MEMORY_STATUSES)[number];
export type MemorySource = (typeof MEMORY_SOURCES)[number];

/** Companion preferences as edited in settings (camelCase app shape). */
export interface CompanionPreferences {
  tonePreference: TonePreference;
  responseLength: ResponseLength;
  defaultSupportPreference: SupportPreference;
  humorLevel: HumorLevel;
  faithPreference: FaithPreference;
  planningStyle: PlanningStyle;
  encouragementStyle: EncouragementStyle;
  adaptiveLearningEnabled: boolean;
}
