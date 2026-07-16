import { describe, expect, it } from "vitest";

import {
  adaptationTier,
  applyContradiction,
  applyRepeatedEvidence,
  applyTimeDecay,
  applyUserCorrection,
  extractExplicitObservations,
  isAllowedPreferenceKey,
  isHumorCorrection,
  resolveActivePreferences,
  resolveApprovedSharedPhrases,
  resolveOptedOutThemes,
} from "@/lib/core/adaptation-policy";
import { ADAPTIVE_PREFERENCE_KEYS } from "@/lib/core/types";

import type { AdaptivePreference } from "@/lib/core/types";

const NOW = new Date("2026-07-15T12:00:00Z");

function preference(overrides: Partial<AdaptivePreference> = {}): AdaptivePreference {
  return {
    id: "p1",
    key: "prefers-examples",
    value: {},
    confidence: 0.8,
    evidenceCount: 4,
    status: "active",
    firstObservedAt: "2026-06-01T00:00:00Z",
    lastObservedAt: "2026-07-10T00:00:00Z",
    expiresAt: null,
    ...overrides,
  };
}

describe("confidence model — transparent and deterministic", () => {
  it("repeated evidence raises confidence by a fixed increment", () => {
    expect(applyRepeatedEvidence(0.3, false)).toBeCloseTo(0.45);
    expect(applyRepeatedEvidence(0.3, true)).toBeCloseTo(0.6);
  });

  it("confidence is bounded 0..1", () => {
    expect(applyRepeatedEvidence(0.95, true)).toBe(1);
    expect(applyUserCorrection(0.1)).toBe(0);
  });

  it("contradiction lowers confidence", () => {
    expect(applyContradiction(0.8)).toBeCloseTo(0.55);
  });

  it("user correction lowers confidence more than contradiction", () => {
    expect(applyUserCorrection(0.8)).toBeCloseTo(0.4);
  });

  it("time decay weakens unsupported preferences", () => {
    expect(applyTimeDecay(0.8, "2026-04-15T12:00:00Z", NOW)).toBeCloseTo(0.5);
    expect(applyTimeDecay(0.8, "2026-07-14T12:00:00Z", NOW)).toBeCloseTo(0.8);
  });

  it("thresholds: low never adapts persistently; high is reviewable", () => {
    expect(adaptationTier(0.2)).toBe("none");
    expect(adaptationTier(0.5)).toBe("temporary");
    expect(adaptationTier(0.85)).toBe("reviewable");
  });
});

describe("resolveActivePreferences — the adaptation gate", () => {
  it("returns nothing when the user disabled adaptation", () => {
    expect(resolveActivePreferences([preference()], false, NOW)).toEqual([]);
  });

  it("filters paused/reset preferences (user can disable adaptation per item)", () => {
    expect(resolveActivePreferences([preference({ status: "paused" })], true, NOW)).toEqual([]);
    expect(resolveActivePreferences([preference({ status: "reset" })], true, NOW)).toEqual([]);
  });

  it("filters expired and decayed-below-threshold preferences", () => {
    expect(
      resolveActivePreferences([preference({ expiresAt: "2026-07-01T00:00:00Z" })], true, NOW),
    ).toEqual([]);
    expect(
      resolveActivePreferences(
        [preference({ confidence: 0.4, lastObservedAt: "2026-03-01T00:00:00Z" })],
        true,
        NOW,
      ),
    ).toEqual([]);
  });

  it("rejects keys outside the allowlist — sensitive adaptation cannot exist", () => {
    const smuggled = preference({ key: "religious-identity" as never });
    expect(resolveActivePreferences([smuggled], true, NOW)).toEqual([]);
    expect(isAllowedPreferenceKey("trauma-history")).toBe(false);
    expect(isAllowedPreferenceKey("sexuality")).toBe(false);
    for (const key of ADAPTIVE_PREFERENCE_KEYS) {
      expect(isAllowedPreferenceKey(key)).toBe(true);
    }
  });
});

describe("extractExplicitObservations — explicit statements only", () => {
  it("detects 'be more direct'", () => {
    const observations = extractExplicitObservations("Please be more direct with me.", "none");
    expect(observations.map((o) => o.key)).toContain("appreciates-direct-challenge");
  });

  it("detects 'stop using emojis'", () => {
    const observations = extractExplicitObservations("Stop using emojis.", "none");
    expect(observations.map((o) => o.key)).toContain("prefers-no-emojis");
  });

  it("detects concise and bullet requests", () => {
    expect(
      extractExplicitObservations("Keep it short please.", "none").map((o) => o.key),
    ).toContain("prefers-concise-when-overwhelmed");
    expect(extractExplicitObservations("Use bullet points.", "none").map((o) => o.key)).toContain(
      "likes-bullet-points",
    );
  });

  it("returns nothing for merely implied preferences", () => {
    expect(extractExplicitObservations("Today was long and hard.", "none")).toEqual([]);
  });

  it("never harvests adaptation from a safety moment", () => {
    expect(extractExplicitObservations("Be more direct with me.", "support")).toEqual([]);
    expect(extractExplicitObservations("Be more direct with me.", "urgent")).toEqual([]);
  });

  it("recognizes humor corrections", () => {
    expect(isHumorCorrection("That joke didn't land.")).toBe(true);
    expect(isHumorCorrection("That landed well!")).toBe(false);
  });
});

describe("shared language — earned, never sensitive", () => {
  it("requires reviewable confidence and repeated evidence", () => {
    const young = preference({
      key: "shared-phrase",
      value: { phrase: "future me" },
      confidence: 0.5,
      evidenceCount: 2,
    });
    expect(resolveApprovedSharedPhrases([young], NOW)).toEqual([]);

    const earned = preference({
      key: "shared-phrase",
      value: { phrase: "future me" },
      confidence: 0.85,
      evidenceCount: 4,
    });
    expect(resolveApprovedSharedPhrases([earned], NOW)).toEqual(["future me"]);
  });

  it("never approves sensitive phrases whatever the evidence", () => {
    const sensitive = preference({
      key: "shared-phrase",
      value: { phrase: "my church family" },
      confidence: 0.95,
      evidenceCount: 9,
    });
    expect(resolveApprovedSharedPhrases([sensitive], NOW)).toEqual([]);
  });

  it("collects theme opt-outs", () => {
    const optOut = preference({
      key: "pattern-theme-opt-out",
      value: { theme: "boundaries" },
    });
    expect(resolveOptedOutThemes([optOut])).toEqual(["boundaries"]);
  });
});
