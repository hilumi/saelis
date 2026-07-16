import { describe, expect, it } from "vitest";

import {
  buildMirroringGuidance,
  observeCommunicationStyle,
  requestsDirectness,
} from "@/lib/core/communication-style";

describe("observeCommunicationStyle — form, never identity", () => {
  it("reads high-energy punctuation and caps", () => {
    const style = observeCommunicationStyle("OMG YES!!!!!");
    expect(style.energy).toBe("high-energy");
  });

  it("reads emoji density", () => {
    expect(observeCommunicationStyle("okay 😂").emojiDensity).toBe("light");
    expect(observeCommunicationStyle("yes 😂😂🎉 wow 🙌").emojiDensity).toBe("frequent");
    expect(observeCommunicationStyle("okay.").emojiDensity).toBe("none");
  });

  it("reads formal analytical style", () => {
    const style = observeCommunicationStyle(
      "I need an objective assessment with options and constraints before I choose.",
    );
    expect(style.structure).toBe("analytical");
    expect(style.colloquialIntensity).toBe("none");
  });

  it("reads short-message rhythm", () => {
    const style = observeCommunicationStyle("Bad day. Long week. Tired.");
    expect(style.sentenceRhythm).toBe("short");
  });

  it("reads colloquial intensity without inferring identity", () => {
    const style = observeCommunicationStyle("ngl I'm kinda done with this, lowkey wanna quit");
    expect(style.colloquialIntensity).not.toBe("none");
    // The observation carries only form fields — nothing that could encode a
    // protected trait exists on the type.
    const keys = Object.keys(style).sort();
    expect(keys).toEqual(
      [
        "colloquialIntensity",
        "confidence",
        "directness",
        "emojiDensity",
        "energy",
        "evidenceCount",
        "humor",
        "sentenceRhythm",
        "structure",
      ].sort(),
    );
  });

  it("detects explicit directness requests", () => {
    expect(requestsDirectness("Be honest with me.")).toBe(true);
    expect(requestsDirectness("Don't be soft with me.")).toBe(true);
    expect(requestsDirectness("Give it to me straight.")).toBe(true);
    expect(requestsDirectness("What a soft blanket.")).toBe(false);
  });

  it("detects humor signals from laughter and emoji", () => {
    expect(observeCommunicationStyle("Girl… absolutely not. 😂").humor).not.toBe("none");
    expect(observeCommunicationStyle("The invoice is attached.").humor).toBe("none");
  });
});

describe("buildMirroringGuidance — no caricature, no dialect mimicry", () => {
  it("never instructs slang repetition or dialect performance", () => {
    const guidance = buildMirroringGuidance(
      observeCommunicationStyle("Girl… absolutely not. 😂 ngl I'm done lol"),
    ).join(" ");
    expect(guidance).toMatch(/do not repeat their slang/i);
    expect(guidance).toMatch(/never a caricature/i);
    expect(guidance).not.toMatch(/use slang/i);
    expect(guidance).not.toMatch(/speak like/i);
  });

  it("no repeated slang without evidence: quiet formal text gets no casual-register line", () => {
    const guidance = buildMirroringGuidance(
      observeCommunicationStyle("I would appreciate a considered reply."),
    ).join(" ");
    expect(guidance).not.toMatch(/casually/i);
  });

  it("forbids emojis when the user uses none", () => {
    const guidance = buildMirroringGuidance(observeCommunicationStyle("Plain message."));
    expect(guidance).toContain("Do not use emojis.");
  });

  it("welcomes matched energy for high-energy messages", () => {
    const guidance = buildMirroringGuidance(observeCommunicationStyle("WE GOT THE HOUSE!!!"));
    expect(guidance.join(" ")).toMatch(/match the user's energy/i);
  });

  it("becomes structured for analytical requests", () => {
    const guidance = buildMirroringGuidance(
      observeCommunicationStyle("Objective assessment please: options, constraints, tradeoffs."),
    );
    expect(guidance.join(" ")).toMatch(/structured and concise/i);
  });

  it("no cultural inference: guidance is identical for equivalent form in different words", () => {
    const a = buildMirroringGuidance(observeCommunicationStyle("Girl… absolutely not. 😂"));
    const b = buildMirroringGuidance(observeCommunicationStyle("Dude… absolutely not. 😂"));
    expect(a).toEqual(b);
  });
});
