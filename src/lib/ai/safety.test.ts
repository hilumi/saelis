import { describe, expect, it } from "vitest";

import { runSafetyPreCheck, URGENT_RESPONSE_MESSAGE, US_CRISIS_RESOURCES } from "@/lib/ai/safety";

describe("runSafetyPreCheck (prototype — documented as incomplete)", () => {
  it("flags obvious urgent phrases", () => {
    expect(runSafetyPreCheck("I want to die").level).toBe("urgent");
    expect(runSafetyPreCheck("I've been thinking about suicide").level).toBe("urgent");
    expect(runSafetyPreCheck("I keep hurting myself").level).toBe("urgent");
    expect(runSafetyPreCheck("everyone would be better off without me").level).toBe("urgent");
  });

  it("flags support-level distress", () => {
    expect(runSafetyPreCheck("everything feels hopeless").level).toBe("support");
    expect(runSafetyPreCheck("I can't go on like this").level).toBe("support");
    expect(runSafetyPreCheck("I had a panic attack at work").level).toBe("support");
  });

  it("passes benign text", () => {
    expect(runSafetyPreCheck("I had a lovely walk today").level).toBe("none");
    expect(runSafetyPreCheck("deciding between two job offers").level).toBe("none");
  });

  it("urgent copy includes 988 and 911 and avoids diagnosis language", () => {
    expect(URGENT_RESPONSE_MESSAGE).toContain("988");
    expect(URGENT_RESPONSE_MESSAGE).toContain("911");
    expect(URGENT_RESPONSE_MESSAGE.toLowerCase()).not.toContain("diagnos");
    expect(URGENT_RESPONSE_MESSAGE.toLowerCase()).not.toContain("disorder");
  });

  it("exports US crisis resources", () => {
    expect(US_CRISIS_RESOURCES.lifelineNumber).toBe("988");
    expect(US_CRISIS_RESOURCES.emergencyNumber).toBe("911");
  });
});
