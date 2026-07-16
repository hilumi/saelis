import { describe, expect, it } from "vitest";

import {
  containsSecretMaterial,
  feedbackSchema,
  horizonHandoffSchema,
  memoryApprovalSchema,
  memoryEditSchema,
} from "@/lib/validation/memory";

const VALID_EDIT = {
  memoryId: "6fa459ea-ee8a-4ca4-894e-db77e160355e",
  kind: "constellation",
  title: "Bo",
  content: "My dog is named Bo.",
  reason: "Asked to remember.",
};

describe("memory validation", () => {
  it("accepts valid kinds and rejects invalid kinds", () => {
    expect(memoryEditSchema.safeParse(VALID_EDIT).success).toBe(true);
    expect(memoryEditSchema.safeParse({ ...VALID_EDIT, kind: "north-star" }).success).toBe(true);
    expect(memoryEditSchema.safeParse({ ...VALID_EDIT, kind: "garden-seed" }).success).toBe(false);
  });

  it("enforces length constraints", () => {
    expect(memoryEditSchema.safeParse({ ...VALID_EDIT, title: "x".repeat(121) }).success).toBe(
      false,
    );
    expect(memoryEditSchema.safeParse({ ...VALID_EDIT, content: "x".repeat(1001) }).success).toBe(
      false,
    );
    expect(memoryEditSchema.safeParse({ ...VALID_EDIT, content: "  " }).success).toBe(false);
  });

  it("detects obvious secret material", () => {
    expect(containsSecretMaterial("my password is hunter2")).toBe(true);
    expect(containsSecretMaterial("the api key is sk-abcdefgh1234")).toBe(true);
    expect(containsSecretMaterial("My dog is named Bo.")).toBe(false);
  });

  it("approval defaults to constellation and requires explicit north-star", () => {
    const parsed = memoryApprovalSchema.parse({ category: "shared-context", content: "A fact" });
    expect(parsed.kind).toBe("constellation");
    expect(parsed.edited).toBe(false);
    const north = memoryApprovalSchema.parse({
      category: "shared-context",
      content: "A hope",
      kind: "north-star",
      edited: true,
    });
    expect(north.kind).toBe("north-star");
  });

  it("horizon hand-off enforces database bounds", () => {
    expect(
      horizonHandoffSchema.safeParse({ title: "Step", description: "Do it.", estimatedMinutes: 10 })
        .success,
    ).toBe(true);
    expect(
      horizonHandoffSchema.safeParse({
        title: "Step",
        description: "Do it.",
        estimatedMinutes: 600,
      }).success,
    ).toBe(false);
  });

  it("feedback accepts categories only from the v0.8 allowlist", () => {
    for (const category of [
      "too-soft",
      "too-direct",
      "too-long",
      "too-generic",
      "missed-need",
      "humor-did-not-land",
    ]) {
      expect(feedbackSchema.safeParse({ helpful: false, category }).success).toBe(true);
    }
    expect(feedbackSchema.safeParse({ helpful: false, category: "annoying" }).success).toBe(false);
    expect(feedbackSchema.safeParse({ helpful: false, category: "too-much-advice" }).success).toBe(
      false,
    );
    // The category is always optional.
    expect(feedbackSchema.safeParse({ helpful: false, category: null }).success).toBe(true);
    expect(feedbackSchema.parse({ helpful: true }).category).toBeNull();
  });
});
