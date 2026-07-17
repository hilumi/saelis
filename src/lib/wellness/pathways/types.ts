/**
 * Saelis Her — pathway registry types.
 *
 * The registry (registry.ts) is the single source of truth for pathway
 * behavior. General components read from the registry rather than
 * hard-coding pathway checks. See CLAUDE.md ("The neutral-naming rule").
 */

export const PATHWAY_KEYS = ["phoenix", "restore", "strong", "nourish", "rhythm", "reset"] as const;
export type PathwayKey = (typeof PATHWAY_KEYS)[number];

export const PATHWAY_CATEGORIES = [
  "body-recomposition",
  "postpartum-recovery",
  "strength",
  "nutrition",
  "cycle-support",
  "recovery-mode",
] as const;
export type PathwayCategory = (typeof PATHWAY_CATEGORIES)[number];

/** Feature modules a pathway can contribute to shared surfaces. */
export const PATHWAY_MODULES = [
  "workouts",
  "nutrition",
  "hydration",
  "daily-check-in",
  "postpartum-check-in",
  "cycle-tracking",
  "recovery",
  "metrics",
  "milestones",
] as const;
export type PathwayModule = (typeof PATHWAY_MODULES)[number];

/** Notification categories a pathway enables by default (opt-out per user). */
export const NOTIFICATION_CATEGORIES = [
  "daily-plan",
  "check-in-reminder",
  "milestone-celebration",
  "gentle-encouragement",
  "hydration-reminder",
] as const;
export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

/**
 * Deterministic safety requirements a pathway imposes. These are enforced in
 * code (rules engine / safety gates) — the LLM never overrides them.
 */
export const PATHWAY_SAFETY_REQUIREMENTS = [
  /** Daily check-in red flags (chest pain, dizziness…) trigger a safety hold. */
  "daily-red-flag-screen",
  /** Postpartum red flags (heavy bleeding, calf pain…) trigger a safety hold. */
  "postpartum-red-flag-screen",
  /** Calorie guidance must respect conservative floors; never aggressive deficits. */
  "calorie-floor",
  /** Extra calorie/intensity conservatism while breastfeeding. */
  "breastfeeding-adjustment",
  /** Pain during movement always reduces or stops the plan — never "push through". */
  "pain-stop-rule",
  /** Progression is gated by phase/stage, never accelerated automatically. */
  "phased-progression",
  /** Pelvic-floor symptoms route to gentler options and professional-evaluation guidance. */
  "pelvic-floor-symptom-routing",
] as const;
export type PathwaySafetyRequirement = (typeof PATHWAY_SAFETY_REQUIREMENTS)[number];

/** Sections of the enrollment/onboarding flow a pathway needs. */
export const ONBOARDING_SECTIONS = [
  "goals",
  "movement-experience",
  "training-logistics",
  "nutrition-preferences",
  "tracking-preferences",
  "postpartum-intake",
  "cycle-preferences",
  "notification-style",
] as const;
export type OnboardingSection = (typeof ONBOARDING_SECTIONS)[number];

export interface PathwayDefinition {
  key: PathwayKey;
  displayName: string;
  shortDescription: string;
  longDescription: string;
  category: PathwayCategory;
  /** App route for the pathway's surface (under the protected Her area). */
  route: string;
  /** Icon identifier resolved by the UI layer (no icon imports here). */
  icon: string;
  onboardingSections: readonly OnboardingSection[];
  supportedModules: readonly PathwayModule[];
  defaultNotificationCategories: readonly NotificationCategory[];
  safetyRequirements: readonly PathwaySafetyRequirement[];
  /** Whether this pathway may temporarily overlay/simplify other pathways. */
  mayOverlayOtherPathways: boolean;
  active: boolean;
  sortOrder: number;
}
