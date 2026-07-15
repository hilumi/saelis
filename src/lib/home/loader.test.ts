import { describe, expect, it } from "vitest";

import { getGreetingPeriod, GREETINGS, selectContinuation } from "@/lib/home/loader";

function at(hours: number): Date {
  return new Date(2026, 5, 15, hours, 0, 0, 0);
}

describe("getGreetingPeriod", () => {
  it("maps every window", () => {
    expect(getGreetingPeriod(at(3))).toBe("night");
    expect(getGreetingPeriod(at(6))).toBe("early-morning");
    expect(getGreetingPeriod(at(9))).toBe("morning");
    expect(getGreetingPeriod(at(14))).toBe("afternoon");
    expect(getGreetingPeriod(at(19))).toBe("evening");
    expect(getGreetingPeriod(at(23))).toBe("night");
  });

  it("keeps copy restrained — no mood inference, no rush", () => {
    expect(GREETINGS.night.line).toBe("There is no rush.");
    expect(GREETINGS.morning.line).toBe("Come as you are.");
    for (const greeting of Object.values(GREETINGS)) {
      expect(greeting.line.toLowerCase()).not.toContain("miss");
      expect(greeting.line.toLowerCase()).not.toContain("streak");
    }
  });
});

describe("selectContinuation", () => {
  const step = { title: "Water the ferns", estimatedMinutes: 10 };
  const arrival = { createdAt: new Date().toISOString(), supportNeed: "clarify" };

  it("prioritizes conversation, then horizon, then arrival, then north star", () => {
    expect(
      selectContinuation({
        hasRecentConversation: true,
        nextStep: step,
        latestArrival: arrival,
        northStarCount: 1,
      })?.type,
    ).toBe("conversation");
    expect(
      selectContinuation({
        hasRecentConversation: false,
        nextStep: step,
        latestArrival: arrival,
        northStarCount: 1,
      })?.type,
    ).toBe("horizon");
    expect(
      selectContinuation({
        hasRecentConversation: false,
        nextStep: null,
        latestArrival: arrival,
        northStarCount: 1,
      })?.type,
    ).toBe("arrival");
    expect(
      selectContinuation({
        hasRecentConversation: false,
        nextStep: null,
        latestArrival: null,
        northStarCount: 1,
      })?.type,
    ).toBe("north-star");
    expect(
      selectContinuation({
        hasRecentConversation: false,
        nextStep: null,
        latestArrival: null,
        northStarCount: 0,
      }),
    ).toBeNull();
  });

  it("never carries private content — only chosen step titles", () => {
    const conversation = selectContinuation({
      hasRecentConversation: true,
      nextStep: null,
      latestArrival: null,
      northStarCount: 0,
    });
    expect(conversation?.detail).toBeNull();
    const northStar = selectContinuation({
      hasRecentConversation: false,
      nextStep: null,
      latestArrival: null,
      northStarCount: 3,
    });
    expect(northStar?.detail).toBeNull();
  });

  it("skips stale arrivals", () => {
    const old = {
      createdAt: new Date(Date.now() - 10 * 86_400_000).toISOString(),
      supportNeed: "listen",
    };
    expect(
      selectContinuation({
        hasRecentConversation: false,
        nextStep: null,
        latestArrival: old,
        northStarCount: 0,
      }),
    ).toBeNull();
  });
});
