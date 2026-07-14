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
import { createMemoryProposalCandidate } from "@/lib/light/memory-policy";

import type { LightPlan, SupportMode } from "@/lib/light/types";

/**
 * Development-only companion. Returns deterministic, contract-valid responses
 * chosen by simple keyword heuristics so every support mode can be exercised
 * without a live model. Every response is validated against the Zod contract
 * before it is returned, exactly as a live provider's output will be.
 */
export class MockCompanionProvider implements CompanionProvider {
  async respond(input: CompanionRequest, plan?: LightPlan): Promise<CompanionResponse> {
    // With a LightPlan, the plan (not keywords) decides the shape of the
    // response — exactly how a live provider will be constrained. Without a
    // plan we fall back to the legacy keyword heuristics for compatibility.
    const response = plan ? buildPlannedResponse(input, plan) : buildMockResponse(input);
    return companionResponseSchema.parse(response);
  }
}

// ---------------------------------------------------------------------------
// LightPlan-driven mock rendering (deterministic)
// ---------------------------------------------------------------------------

const PLANNED_MESSAGES: Record<SupportMode, { brief: string; moderate: string; question: string }> =
  {
    witness: {
      brief: "I'm taking that in. It sounds like it landed hard.",
      moderate:
        "I'm taking that in — all of it. What you described sounds like it landed hard, and you told it plainly.",
      question: "What part of it is sitting heaviest right now?",
    },
    explore: {
      brief: "I'm listening. Say more, wherever it starts.",
      moderate:
        "I'm listening. There's no wrong place to start — follow whichever thread feels most alive.",
      question: "What feels most present for you right now?",
    },
    comfort: {
      brief: "That's a lot to hold. You don't have to hold it alone right now.",
      moderate:
        "That's a lot to hold, and you've been holding it a while. Nothing here needs solving tonight — you don't have to hold it alone right now.",
      question: "Would it help to say a little more, or just have company?",
    },
    clarify: {
      brief: "Let's lay it out before deciding anything.",
      moderate:
        "Before any advice, let's lay it out: what's fact, what's fear, what choices actually exist, and what you want to be true afterward.",
      question: "Which option do you keep circling back to?",
    },
    act: {
      brief: "One small true step is enough. Here's one that might fit.",
      moderate:
        "When everything is loud, one small true step is enough. Here's one that might fit what you have in you today.",
      question: "Does that feel like the right size?",
    },
    celebrate: {
      brief: "That's real, and it's yours. Take a second to feel it.",
      moderate:
        "That's real, and it's yours. Before the day moves on, take a second to actually feel it — this one counts.",
      question: "What part of it are you most glad about?",
    },
    connect: {
      brief: "We can find words that still sound like you.",
      moderate:
        "We can find words that are honest and still sound like you. Tell me who it's for and what you most want them to understand.",
      question: "What do you most want them to know when they finish reading?",
    },
    reflect: {
      brief: "There's something underneath this worth looking at gently.",
      moderate:
        "There's something underneath this that seems worth looking at gently — not to fix it, just to see it more clearly.",
      question: "When did you first notice it working on you like this?",
    },
    presence: {
      brief: "I'm here. No fixing, no plan.",
      moderate: "I'm here. No fixing, no plan, no clock. Take whatever time you need.",
      question: "",
    },
  };

function buildPlannedResponse(input: CompanionRequest, plan: LightPlan): CompanionResponse {
  const { understanding, reflection, memory } = plan;

  if (understanding.safetyLevel === "urgent") {
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

  const mode = understanding.supportMode;
  const template = PLANNED_MESSAGES[mode];
  const brief = input.preferences.responseLength === "brief";
  let message = brief ? template.brief : template.moderate;
  if (input.preferences.responseLength === "expansive" && !brief) {
    message = `${template.moderate} However this goes, there's no hurry from here.`;
  }

  const suggestedStep = reflection.shouldOfferAction
    ? {
        title: "Clear one square foot",
        description:
          input.preferences.planningStyle === "small-plan"
            ? "Pick the smallest piece of what's in front of you, finish only that, then decide if a second piece fits."
            : "Pick the smallest piece of what's in front of you and finish only that.",
        estimatedMinutes: 10,
      }
    : null;

  const proposedMemory = memory.mayProposeMemory
    ? createMemoryProposalCandidate(input.message, input.approvedMemories)
    : null;

  return {
    supportMode: mode,
    message,
    followUp: reflection.shouldAskQuestion && template.question ? template.question : null,
    closingLine: plan.closingPolicy.line,
    suggestedStep,
    proposedMemory,
    safety:
      understanding.safetyLevel === "support"
        ? { level: "support", message: SUPPORT_RESPONSE_MESSAGE }
        : { level: "none", message: null },
  };
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
