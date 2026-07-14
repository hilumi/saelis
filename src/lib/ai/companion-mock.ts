import {
  companionResponseSchema,
  type CompanionProvider,
  type CompanionRequest,
  type CompanionResponse,
} from "@/lib/ai/companion-contract";
import {
  runSafetyPreCheck,
  SUPPORT_RESPONSE_MESSAGE,
  URGENT_RESPONSE_MESSAGE,
} from "@/lib/ai/safety";

/**
 * Development-only companion. Returns deterministic, contract-valid responses
 * chosen by simple keyword heuristics so every support mode can be exercised
 * without a live model. Every response is validated against the Zod contract
 * before it is returned, exactly as a live provider's output will be.
 */
export class MockCompanionProvider implements CompanionProvider {
  async respond(input: CompanionRequest): Promise<CompanionResponse> {
    const response = buildMockResponse(input);
    return companionResponseSchema.parse(response);
  }
}

function buildMockResponse(input: CompanionRequest): CompanionResponse {
  const text = input.message.toLowerCase();
  const safety = runSafetyPreCheck(input.message);

  if (safety.level === "urgent") {
    return {
      supportMode: "presence",
      message: URGENT_RESPONSE_MESSAGE,
      followUp: null,
      closingLine: null,
      suggestedStep: null,
      proposedMemory: null,
      safety: { level: "urgent", message: URGENT_RESPONSE_MESSAGE },
    };
  }

  const base: Pick<CompanionResponse, "safety"> = {
    safety:
      safety.level === "support"
        ? { level: "support", message: SUPPORT_RESPONSE_MESSAGE }
        : { level: "none", message: null },
  };

  if (/(remember|don'?t forget) (that|this|me)?/i.test(input.message)) {
    return {
      ...base,
      supportMode: "reflect",
      message:
        "That sounds worth keeping. Would you like me to remember it? Nothing is saved unless you say yes.",
      followUp: null,
      closingLine: null,
      suggestedStep: null,
      proposedMemory: {
        category: "shared-context",
        content: input.message.slice(0, 500),
        reason: "You asked me to remember this.",
      },
    };
  }

  if (/(celebrate|got the job|passed|we did it|proud of|finally finished|good news)/.test(text)) {
    return {
      ...base,
      supportMode: "celebrate",
      message:
        "That's real, and it's yours. Take a second to actually feel it before the day moves on.",
      followUp: "What part of it are you most glad about?",
      closingLine: "Carry this one with you today.",
      suggestedStep: null,
      proposedMemory: null,
    };
  }

  if (/(need to say|need to vent|just hear me|get this out)/.test(text)) {
    return {
      ...base,
      supportMode: "witness",
      message: "I hear you. All of it. You don't need to soften anything for me.",
      followUp: null,
      closingLine: null,
      suggestedStep: null,
      proposedMemory: null,
    };
  }

  if (/(just listen|be with me|stay with me|don'?t fix|sit with me|stay here)/.test(text)) {
    return {
      ...base,
      supportMode: "presence",
      message: "I'm here. No fixing, no plan. Take whatever time you need.",
      followUp: null,
      closingLine: null,
      suggestedStep: null,
      proposedMemory: null,
    };
  }

  if (/(lonely|alone|no one to talk|miss (him|her|them))/.test(text)) {
    return {
      ...base,
      supportMode: "connect",
      message:
        "Loneliness has a way of shrinking the world. Is there one person — even someone you haven't spoken to in a while — who'd be glad to hear from you?",
      followUp:
        "If reaching out feels heavy, we can figure out the smallest version of it together.",
      closingLine: null,
      suggestedStep: null,
      proposedMemory: null,
    };
  }

  if (/(what should i do|decide|torn between|can'?t choose|stuck on)/.test(text)) {
    return {
      ...base,
      supportMode: "clarify",
      message:
        "Let's untangle it a little before deciding anything. What would each option protect, and what would each one cost?",
      followUp: "Say more about the option you keep circling back to.",
      closingLine: null,
      suggestedStep: {
        title: "Name the real question",
        description:
          "Write one sentence that captures what this decision is actually about for you.",
        estimatedMinutes: 5,
      },
      proposedMemory: null,
    };
  }

  if (/(sad|grie(f|ving)|hurt|heartbroken|lost (my|someone)|crying)/.test(text)) {
    return {
      ...base,
      supportMode: "comfort",
      message:
        "I'm sorry it hurts like this. You don't have to make sense of it right now — feeling it is enough.",
      followUp: "Would it help to say more, or would you rather just have company for a bit?",
      closingLine: "Be gentle with yourself tonight.",
      suggestedStep: null,
      proposedMemory: null,
    };
  }

  if (/(next step|where do i start|overwhelmed|too much to do)/.test(text)) {
    return {
      ...base,
      supportMode: "act",
      message: "When everything is loud, one small true step is enough. Here's one that might fit.",
      followUp: null,
      closingLine: "One step is a whole day's worth of brave.",
      suggestedStep: {
        title: "Clear one square foot",
        description: "Pick the smallest piece of what's in front of you and finish only that.",
        estimatedMinutes: 10,
      },
      proposedMemory: null,
    };
  }

  return {
    ...base,
    supportMode: input.supportHint ?? "explore",
    message:
      "I'm listening. Tell me more about what's on your mind — there's no wrong place to start.",
    followUp: "What feels most present for you right now?",
    closingLine: null,
    suggestedStep: null,
    proposedMemory: null,
  };
}
