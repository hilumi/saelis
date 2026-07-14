import { describe, expect, it } from "vitest";

import { companionResponseSchema, type CompanionRequest } from "@/lib/ai/companion-contract";
import { MockCompanionProvider } from "@/lib/ai/companion-mock";
import { DEFAULT_COMPANION_PREFERENCES } from "@/lib/companion-defaults";
import { createLightPlan } from "@/lib/light";
import { makeLightContext } from "@/test/light-fixtures";

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

describe("MockCompanionProvider with a LightPlan", () => {
  async function respondWithPlan(
    message: string,
    overrides: Parameters<typeof makeLightContext>[0] = {},
  ) {
    const context = makeLightContext({ message, ...overrides });
    const plan = createLightPlan(context);
    const response = await provider.respond(
      {
        ...request(message),
        preferences: context.companionProfile,
        approvedMemories: context.approvedMemories,
      },
      plan,
    );
    return { response, plan };
  }

  it("always returns a contract-valid response", async () => {
    for (const message of [
      "I just need to vent.",
      "Give me three steps.",
      "I did it! I got the job.",
      "Can you just stay with me for a minute?",
      "Help me write a message to my daughter.",
    ]) {
      const { response } = await respondWithPlan(message);
      expect(companionResponseSchema.safeParse(response).success).toBe(true);
    }
  });

  it("witness carries no suggested step", async () => {
    const { response } = await respondWithPlan("I just need to vent.");
    expect(response.supportMode).toBe("witness");
    expect(response.suggestedStep).toBeNull();
  });

  it("presence carries no step and no question", async () => {
    const { response } = await respondWithPlan("Can you just stay with me for a minute?");
    expect(response.supportMode).toBe("presence");
    expect(response.suggestedStep).toBeNull();
    expect(response.followUp).toBeNull();
  });

  it("act offers a step that respects the planning style", async () => {
    const { response } = await respondWithPlan("Give me three steps.", {
      companionProfile: {
        tonePreference: "balanced",
        responseLength: "moderate",
        defaultSupportPreference: "guide-first",
        humorLevel: "light",
        faithPreference: "ask",
        planningStyle: "small-plan",
        encouragementStyle: "warm",
        adaptiveLearningEnabled: true,
      },
    });
    expect(response.supportMode).toBe("act");
    expect(response.suggestedStep).not.toBeNull();
    expect(response.suggestedStep?.description).toContain("second piece");
  });

  it("celebrate matches warmth without redirecting to productivity", async () => {
    const { response } = await respondWithPlan("I did it! I got the job.");
    expect(response.supportMode).toBe("celebrate");
    expect(response.suggestedStep).toBeNull();
    expect(response.message.toLowerCase()).not.toContain("next step");
  });

  it("connect asks for communication context", async () => {
    const { response } = await respondWithPlan("Help me write a message to my daughter.");
    expect(response.supportMode).toBe("connect");
    expect(response.followUp).toContain("know");
  });

  it("respects a brief response-length preference", async () => {
    const { response: brief } = await respondWithPlan("I just need to vent.", {
      companionProfile: { ...DEFAULT_COMPANION_PREFERENCES, responseLength: "brief" },
    });
    const { response: moderate } = await respondWithPlan("I just need to vent.");
    expect(brief.message.length).toBeLessThan(moderate.message.length);
  });

  it("proposes memory only when the plan permits it", async () => {
    const allowed = await respondWithPlan("Please remember that my dog is named Bo.");
    expect(allowed.plan.memory.mayProposeMemory).toBe(true);
    expect(allowed.response.proposedMemory?.content).toContain("Bo");

    const disabled = await respondWithPlan("Please remember that my dog is named Bo.", {
      privacy: { saveConversationHistory: true, allowCompanionMemory: false },
    });
    expect(disabled.plan.memory.mayProposeMemory).toBe(false);
    expect(disabled.response.proposedMemory).toBeNull();
  });

  it("urgent plans override everything", async () => {
    const { response } = await respondWithPlan("I'm thinking about harming myself.");
    expect(response.safety.level).toBe("urgent");
    expect(response.message).toContain("988");
    expect(response.suggestedStep).toBeNull();
    expect(response.proposedMemory).toBeNull();
  });
});
