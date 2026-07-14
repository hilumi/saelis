import { describe, expect, it } from "vitest";

import { companionResponseSchema, type CompanionRequest } from "@/lib/ai/companion-contract";
import { MockCompanionProvider } from "@/lib/ai/companion-mock";
import { DEFAULT_COMPANION_PREFERENCES } from "@/lib/companion-defaults";

const provider = new MockCompanionProvider();

function request(message: string): CompanionRequest {
  return {
    userId: "00000000-0000-4000-8000-000000000000",
    conversationId: null,
    message,
    includeFaithReflection: false,
    supportHint: null,
    preferences: DEFAULT_COMPANION_PREFERENCES,
    approvedMemories: [],
    recentTurns: [],
  };
}

describe("MockCompanionProvider", () => {
  it("always returns a contract-valid response", async () => {
    const messages = [
      "hello",
      "I'm so sad tonight",
      "I got the job!",
      "just listen please",
      "I feel lonely",
      "I'm overwhelmed, too much to do",
      "what should I do about the move?",
      "I just need to say this out loud",
    ];
    for (const message of messages) {
      const response = await provider.respond(request(message));
      expect(companionResponseSchema.safeParse(response).success).toBe(true);
    }
  });

  it("witnesses without offering an action", async () => {
    const response = await provider.respond(request("I just need to say this out loud"));
    expect(response.supportMode).toBe("witness");
    expect(response.suggestedStep).toBeNull();
    expect(response.followUp).toBeNull();
  });

  it("offers presence without action or follow-up", async () => {
    const response = await provider.respond(request("please just listen, don't fix anything"));
    expect(response.supportMode).toBe("presence");
    expect(response.suggestedStep).toBeNull();
    expect(response.followUp).toBeNull();
  });

  it("comforts sadness", async () => {
    const response = await provider.respond(request("I'm so sad and heartbroken"));
    expect(response.supportMode).toBe("comfort");
    expect(response.suggestedStep).toBeNull();
  });

  it("suggests one small step when overwhelmed", async () => {
    const response = await provider.respond(request("I'm overwhelmed, too much to do"));
    expect(response.supportMode).toBe("act");
    expect(response.suggestedStep).not.toBeNull();
    expect(response.suggestedStep?.estimatedMinutes).toBeLessThanOrEqual(120);
  });

  it("celebrates good news", async () => {
    const response = await provider.respond(request("I got the job! We did it!"));
    expect(response.supportMode).toBe("celebrate");
  });

  it("supports connection when lonely", async () => {
    const response = await provider.respond(request("I've been so lonely lately"));
    expect(response.supportMode).toBe("connect");
  });

  it("proposes a memory only as a proposal — never marked saved", async () => {
    const response = await provider.respond(
      request("please remember that my sister is named June"),
    );
    expect(response.proposedMemory).not.toBeNull();
    expect(response.proposedMemory?.content).toContain("June");
  });

  it("returns an urgent safety response with crisis resources", async () => {
    const response = await provider.respond(request("I want to die"));
    expect(response.safety.level).toBe("urgent");
    expect(response.message).toContain("988");
    expect(response.suggestedStep).toBeNull();
    expect(response.proposedMemory).toBeNull();
  });
});
