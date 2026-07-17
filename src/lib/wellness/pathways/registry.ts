/**
 * Saelis Her — central pathway registry (single source of truth).
 *
 * Rules encoded here (see CLAUDE.md):
 *  - Users may hold several active enrollments at once.
 *  - Restore contains all postpartum-specific functionality.
 *  - Reset may temporarily overlay/simplify plans from other pathways.
 *  - Rhythm is always optional.
 *  - Phoenix is never required for Strong or Nourish.
 *
 * General components must consult this registry instead of hard-coding
 * pathway checks.
 */
import { PATHWAY_KEYS, type PathwayDefinition, type PathwayKey } from "./types";

const definitions: Record<PathwayKey, PathwayDefinition> = {
  phoenix: {
    key: "phoenix",
    displayName: "Phoenix",
    shortDescription: "Sustainable weight management, strength, and healthy habits.",
    longDescription:
      "A patient, sustainable approach to weight management, fitness, strength, and body " +
      "recomposition — built on habits that last, never on punishment, extremes, or " +
      "“bounce back” pressure. Calorie guidance is always an estimate and always conservative.",
    category: "body-recomposition",
    route: "/wellness/her/pathways/phoenix",
    icon: "phoenix",
    onboardingSections: [
      "goals",
      "movement-experience",
      "training-logistics",
      "nutrition-preferences",
      "tracking-preferences",
      "notification-style",
    ],
    supportedModules: [
      "workouts",
      "nutrition",
      "hydration",
      "daily-check-in",
      "metrics",
      "milestones",
      "recovery",
    ],
    defaultNotificationCategories: [
      "daily-plan",
      "check-in-reminder",
      "milestone-celebration",
      "hydration-reminder",
    ],
    safetyRequirements: [
      "daily-red-flag-screen",
      "calorie-floor",
      "pain-stop-rule",
      "phased-progression",
    ],
    mayOverlayOtherPathways: false,
    active: true,
    sortOrder: 1,
  },
  restore: {
    key: "restore",
    displayName: "Restore",
    shortDescription: "Postpartum recovery and a gentle return to fitness.",
    longDescription:
      "A dedicated postpartum pathway: staged recovery, gentle reconnection with movement, and " +
      "a gradual return to strength. Restore never diagnoses, never assumes medical clearance, " +
      "and always yields to your provider's guidance. Symptoms are met with care, not pressure.",
    category: "postpartum-recovery",
    route: "/wellness/her/pathways/restore",
    icon: "restore",
    onboardingSections: [
      "postpartum-intake",
      "goals",
      "movement-experience",
      "training-logistics",
      "tracking-preferences",
      "notification-style",
    ],
    supportedModules: [
      "workouts",
      "daily-check-in",
      "postpartum-check-in",
      "recovery",
      "nutrition",
      "hydration",
      "milestones",
    ],
    defaultNotificationCategories: [
      "daily-plan",
      "check-in-reminder",
      "gentle-encouragement",
      "milestone-celebration",
    ],
    safetyRequirements: [
      "daily-red-flag-screen",
      "postpartum-red-flag-screen",
      "breastfeeding-adjustment",
      "calorie-floor",
      "pain-stop-rule",
      "phased-progression",
      "pelvic-floor-symptom-routing",
    ],
    mayOverlayOtherPathways: false,
    active: true,
    sortOrder: 2,
  },
  strong: {
    key: "strong",
    displayName: "Strong",
    shortDescription: "Progressive strength training on your terms.",
    longDescription:
      "Progressive strength training with no weight-loss requirement. Strong is about " +
      "capability — building strength patiently, at your pace, with careful progression and " +
      "honest form guidance.",
    category: "strength",
    route: "/wellness/her/pathways/strong",
    icon: "strong",
    onboardingSections: [
      "goals",
      "movement-experience",
      "training-logistics",
      "tracking-preferences",
      "notification-style",
    ],
    supportedModules: ["workouts", "daily-check-in", "recovery", "metrics", "milestones"],
    defaultNotificationCategories: ["daily-plan", "check-in-reminder", "milestone-celebration"],
    safetyRequirements: ["daily-red-flag-screen", "pain-stop-rule", "phased-progression"],
    mayOverlayOtherPathways: false,
    active: true,
    sortOrder: 3,
  },
  nourish: {
    key: "nourish",
    displayName: "Nourish",
    shortDescription: "Nutrition, meal planning, and sustainable eating habits.",
    longDescription:
      "Practical nutrition support: meal planning, protein and fiber awareness, hydration, and " +
      "sustainable eating habits that fit real life. All nutrition numbers are estimates — " +
      "Nourish never prescribes extreme restriction and never replaces a dietitian.",
    category: "nutrition",
    route: "/wellness/her/pathways/nourish",
    icon: "nourish",
    onboardingSections: [
      "goals",
      "nutrition-preferences",
      "tracking-preferences",
      "notification-style",
    ],
    supportedModules: ["nutrition", "hydration", "daily-check-in", "metrics", "milestones"],
    defaultNotificationCategories: ["daily-plan", "hydration-reminder", "milestone-celebration"],
    safetyRequirements: ["calorie-floor", "breastfeeding-adjustment"],
    mayOverlayOtherPathways: false,
    active: true,
    sortOrder: 4,
  },
  rhythm: {
    key: "rhythm",
    displayName: "Rhythm",
    shortDescription: "Optional cycle-aware energy and wellness support.",
    longDescription:
      "Optional menstrual-cycle-aware support: gentle awareness of how energy can shift across " +
      "a cycle, reflected in plans and encouragement. Rhythm is always opt-in, always private, " +
      "and never makes medical claims about your cycle.",
    category: "cycle-support",
    route: "/wellness/her/pathways/rhythm",
    icon: "rhythm",
    onboardingSections: ["cycle-preferences", "tracking-preferences", "notification-style"],
    supportedModules: ["cycle-tracking", "daily-check-in", "recovery"],
    defaultNotificationCategories: ["check-in-reminder"],
    safetyRequirements: ["daily-red-flag-screen"],
    mayOverlayOtherPathways: true,
    active: true,
    sortOrder: 5,
  },
  reset: {
    key: "reset",
    displayName: "Reset",
    shortDescription: "A simpler mode for hard seasons.",
    longDescription:
      "A simplified wellness mode for low energy, overwhelm, stress, illness recovery, or " +
      "disrupted routines. Reset temporarily softens plans from your other pathways — smaller " +
      "steps, gentler expectations, no guilt — until you're ready to return.",
    category: "recovery-mode",
    route: "/wellness/her/pathways/reset",
    icon: "reset",
    onboardingSections: ["notification-style"],
    supportedModules: ["daily-check-in", "recovery", "hydration"],
    defaultNotificationCategories: ["gentle-encouragement"],
    safetyRequirements: ["daily-red-flag-screen", "pain-stop-rule"],
    mayOverlayOtherPathways: true,
    active: true,
    sortOrder: 6,
  },
};

/** All pathway definitions in sort order. */
export function listPathways(): PathwayDefinition[] {
  return PATHWAY_KEYS.map((key) => definitions[key]).sort((a, b) => a.sortOrder - b.sortOrder);
}

/** Active pathway definitions in sort order. */
export function listActivePathways(): PathwayDefinition[] {
  return listPathways().filter((pathway) => pathway.active);
}

export function getPathway(key: PathwayKey): PathwayDefinition {
  return definitions[key];
}

export function isPathwayKey(value: unknown): value is PathwayKey {
  return typeof value === "string" && (PATHWAY_KEYS as readonly string[]).includes(value);
}

/** Pathways that may temporarily overlay/simplify others (e.g. Reset). */
export function listOverlayPathways(): PathwayDefinition[] {
  return listPathways().filter((pathway) => pathway.mayOverlayOtherPathways);
}

/** Whether a pathway contributes a given module to shared surfaces. */
export function pathwaySupportsModule(
  key: PathwayKey,
  module: PathwayDefinition["supportedModules"][number],
): boolean {
  return definitions[key].supportedModules.includes(module);
}

/** Union of safety requirements across a set of enrolled pathways. */
export function safetyRequirementsFor(
  keys: readonly PathwayKey[],
): PathwayDefinition["safetyRequirements"][number][] {
  const set = new Set<PathwayDefinition["safetyRequirements"][number]>();
  for (const key of keys) {
    for (const requirement of definitions[key].safetyRequirements) set.add(requirement);
  }
  return [...set];
}
