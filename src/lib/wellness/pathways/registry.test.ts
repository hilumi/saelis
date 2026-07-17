import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  getPathway,
  isPathwayKey,
  listActivePathways,
  listOverlayPathways,
  listPathways,
  pathwaySupportsModule,
  safetyRequirementsFor,
} from "./registry";
import { PATHWAY_KEYS } from "./types";

describe("pathway registry", () => {
  it("contains exactly the six pathway keys", () => {
    expect(listPathways().map((p) => p.key)).toEqual([
      "phoenix",
      "restore",
      "strong",
      "nourish",
      "rhythm",
      "reset",
    ]);
  });

  it("returns pathways in sort order with unique sort values", () => {
    const orders = listPathways().map((p) => p.sortOrder);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
    expect(new Set(orders).size).toBe(orders.length);
  });

  it("validates pathway keys", () => {
    expect(isPathwayKey("phoenix")).toBe(true);
    expect(isPathwayKey("restore")).toBe(true);
    expect(isPathwayKey("mama")).toBe(false);
    expect(isPathwayKey("postpartum")).toBe(false);
    expect(isPathwayKey("")).toBe(false);
    expect(isPathwayKey(42)).toBe(false);
  });

  it("isolates postpartum functionality to Restore only", () => {
    for (const pathway of listPathways()) {
      const hasPostpartumModule = pathway.supportedModules.includes("postpartum-check-in");
      const hasPostpartumIntake = pathway.onboardingSections.includes("postpartum-intake");
      const hasPostpartumScreen = pathway.safetyRequirements.includes("postpartum-red-flag-screen");
      if (pathway.key === "restore") {
        expect(hasPostpartumModule).toBe(true);
        expect(hasPostpartumIntake).toBe(true);
        expect(hasPostpartumScreen).toBe(true);
      } else {
        expect(hasPostpartumModule).toBe(false);
        expect(hasPostpartumIntake).toBe(false);
        expect(hasPostpartumScreen).toBe(false);
      }
    }
  });

  it("marks Reset (and Rhythm) as overlay-capable and no strength pathway", () => {
    const overlays = listOverlayPathways().map((p) => p.key);
    expect(overlays).toContain("reset");
    expect(overlays).not.toContain("phoenix");
    expect(overlays).not.toContain("restore");
    expect(overlays).not.toContain("strong");
  });

  it("keeps Strong and Nourish independent of Phoenix", () => {
    // No dependency concept exists in the registry by design; Strong and
    // Nourish carry their own modules without referencing Phoenix.
    expect(pathwaySupportsModule("strong", "workouts")).toBe(true);
    expect(pathwaySupportsModule("nourish", "nutrition")).toBe(true);
    expect(getPathway("strong").longDescription.toLowerCase()).not.toContain("phoenix");
    expect(getPathway("nourish").longDescription.toLowerCase()).not.toContain("phoenix");
  });

  it("requires the pain-stop rule wherever workouts are supported", () => {
    for (const pathway of listPathways()) {
      if (pathway.supportedModules.includes("workouts")) {
        expect(pathway.safetyRequirements).toContain("pain-stop-rule");
      }
    }
  });

  it("computes the union of safety requirements across enrollments", () => {
    const combined = safetyRequirementsFor(["strong", "restore"]);
    expect(combined).toContain("postpartum-red-flag-screen");
    expect(combined).toContain("pain-stop-rule");
    expect(safetyRequirementsFor([])).toEqual([]);
  });

  it("marks all pathways active for Phase 1", () => {
    expect(listActivePathways()).toHaveLength(PATHWAY_KEYS.length);
  });
});

describe("seed consistency (migration 00007 vs registry)", () => {
  const sql = readFileSync(
    join(process.cwd(), "supabase/migrations/00007_saelis_her_foundation.sql"),
    "utf8",
  );

  it("seeds every registry pathway with matching route and sort order", () => {
    for (const pathway of listPathways()) {
      const seedRow = new RegExp(
        `\\('${pathway.key}', '${pathway.displayName}', '[^']+', '${pathway.category}', ` +
          `'${pathway.route.replaceAll("/", "\\/")}', ${pathway.sortOrder}\\)`,
      );
      expect(sql).toMatch(seedRow);
    }
  });

  it("references only seeded exercise slugs from workout template seeds", () => {
    const exerciseSection = sql.split("insert into public.exercise_library")[1] ?? "";
    const exerciseSlugs = new Set(
      [...exerciseSection.matchAll(/^\s{2}\('([a-z0-9-]+)',/gm)].map((m) => m[1]),
    );
    expect(exerciseSlugs.size).toBeGreaterThanOrEqual(25);

    const templateExerciseSection =
      sql.split("insert into public.workout_template_exercises")[1] ?? "";
    const referenced = [
      ...templateExerciseSection.matchAll(/\('([a-z0-9-]+)', '([a-z0-9-]+)', \d/g),
    ];
    expect(referenced.length).toBeGreaterThan(30);
    for (const [, , exerciseSlug] of referenced) {
      expect(exerciseSlugs, `missing exercise seed: ${exerciseSlug}`).toContain(exerciseSlug);
    }
  });

  it("references only seeded template slugs from template exercise seeds", () => {
    const templateSection = sql.split("insert into public.workout_templates")[1] ?? "";
    const templateSlugs = new Set(
      [...templateSection.matchAll(/^\s{2}\('([a-z0-9-]+)',/gm)].map((m) => m[1]),
    );
    expect(templateSlugs.size).toBeGreaterThanOrEqual(14);

    const templateExerciseSection =
      sql.split("insert into public.workout_template_exercises")[1] ?? "";
    for (const [, templateSlug] of templateExerciseSection.matchAll(
      /\('([a-z0-9-]+)', '[a-z0-9-]+', \d/g,
    )) {
      expect(templateSlugs, `missing template seed: ${templateSlug}`).toContain(templateSlug);
    }
  });

  it("never presents pelvic-floor contractions as universally appropriate", () => {
    expect(sql.toLowerCase()).not.toContain("kegel");
    // The pelvic-floor-aware seeds must carry the individualized-evaluation language.
    expect(sql).toContain("individualized");
    expect(sql).toMatch(/weakness, coordination difficulty, or overactivity/);
  });

  it("uses neutral naming for shared tables (no postpartum terms outside Restore tables)", () => {
    const tableNames = [...sql.matchAll(/create table if not exists public\.([a-z_]+)/g)].map(
      (m) => m[1],
    );
    for (const name of tableNames) {
      if (name && name.startsWith("postpartum_")) continue; // Restore-only tables
      expect(name).not.toContain("mama");
      expect(name).not.toContain("restore");
      expect(name).not.toContain("postpartum");
    }
    expect(tableNames).toContain("postpartum_profiles");
    expect(tableNames).toContain("postpartum_check_ins");
  });
});
