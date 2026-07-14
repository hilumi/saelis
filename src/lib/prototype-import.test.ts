import { describe, expect, it } from "vitest";

import {
  classifyPrototypeKey,
  detectPrototypeData,
  type StorageLike,
} from "@/lib/prototype-import";

function fakeStorage(entries: Record<string, string>): StorageLike {
  const keys = Object.keys(entries);
  return {
    length: keys.length,
    key: (index) => keys[index] ?? null,
    getItem: (key) => entries[key] ?? null,
  };
}

describe("detectPrototypeData", () => {
  it("finds known saelis_* keys and counts records", () => {
    const result = detectPrototypeData(
      fakeStorage({
        saelis_arrivals: JSON.stringify([{ mood: "steady" }, { mood: "bright" }]),
        saelis_preferences: JSON.stringify({ tone: "gentle" }),
        unrelated_key: "ignore me",
      }),
    );
    expect(result.found).toBe(true);
    expect(result.entries).toHaveLength(2);
    const arrivals = result.entries.find((entry) => entry.key === "saelis_arrivals");
    expect(arrivals?.kind).toBe("arrivals");
    expect(arrivals?.recordCount).toBe(2);
    expect(arrivals?.parsed).toBe(true);
  });

  it("marks malformed JSON as unparsed so import will skip it", () => {
    const result = detectPrototypeData(fakeStorage({ saelis_memories: "{not json" }));
    const entry = result.entries[0];
    expect(entry?.parsed).toBe(false);
    expect(entry?.recordCount).toBe(0);
  });

  it("classifies unknown saelis_ keys without dropping them", () => {
    const result = detectPrototypeData(fakeStorage({ saelis_mystery: "[]" }));
    expect(result.entries[0]?.kind).toBe("unknown");
  });

  it("reports nothing found for an empty storage", () => {
    const result = detectPrototypeData(fakeStorage({}));
    expect(result.found).toBe(false);
    expect(result.entries).toHaveLength(0);
  });

  it("never touches non-saelis keys", () => {
    const result = detectPrototypeData(fakeStorage({ other_app_data: "[1,2,3]" }));
    expect(result.found).toBe(false);
  });
});

describe("classifyPrototypeKey", () => {
  it("maps known keys", () => {
    expect(classifyPrototypeKey("saelis_horizon_steps")).toBe("horizon-steps");
    expect(classifyPrototypeKey("saelis_conversations")).toBe("conversations");
    expect(classifyPrototypeKey("saelis_anything_else")).toBe("unknown");
  });
});
