import { describe, expect, it } from "vitest";

import { minutesLabel } from "@/lib/dates";
import { isUuid } from "@/lib/ids";
import { clamp, cn, isNonEmptyString, truncate } from "@/lib/utils";

describe("cn", () => {
  it("joins truthy class names and skips falsy values", () => {
    expect(cn("a", false, null, undefined, "b")).toBe("a b");
  });
});

describe("clamp", () => {
  it("clamps into range", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(50, 0, 10)).toBe(10);
  });
});

describe("truncate", () => {
  it("returns short strings unchanged", () => {
    expect(truncate("hello", 10)).toBe("hello");
  });
  it("truncates long strings with an ellipsis", () => {
    const result = truncate("a".repeat(50), 10);
    expect(result.length).toBeLessThanOrEqual(10);
    expect(result.endsWith("…")).toBe(true);
  });
});

describe("isNonEmptyString", () => {
  it("detects non-empty strings", () => {
    expect(isNonEmptyString("hi")).toBe(true);
    expect(isNonEmptyString("   ")).toBe(false);
    expect(isNonEmptyString(42)).toBe(false);
    expect(isNonEmptyString(null)).toBe(false);
  });
});

describe("minutesLabel", () => {
  it("labels minutes softly", () => {
    expect(minutesLabel(1)).toBe("about a minute");
    expect(minutesLabel(10)).toBe("about 10 minutes");
    expect(minutesLabel(60)).toBe("about an hour");
    expect(minutesLabel(120)).toBe("about 2 hours");
  });
});

describe("isUuid", () => {
  it("accepts valid uuids and rejects everything else", () => {
    expect(isUuid("6fa459ea-ee8a-4ca4-894e-db77e160355e")).toBe(true);
    expect(isUuid("not-a-uuid")).toBe(false);
    expect(isUuid(123)).toBe(false);
  });
});
