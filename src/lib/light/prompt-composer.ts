import { buildConstitutionInstruction } from "@/lib/light/constitution";

import type {
  LightContext,
  MemoryDecision,
  ReflectionResult,
  UnderstandingResult,
} from "@/lib/light/types";

/**
 * Prompt composition — the compact provider request.
 *
 * We request ONLY the final structured response (the CompanionResponse
 * contract): support mode, message, optional follow-up, optional closing
 * line, optional suggested step, optional memory proposal, and a safety
 * object. We never request chain-of-thought, hidden reasoning, or private
 * step-by-step analysis, and instructions are kept short for token economy.
 */

export interface ComposedPrompt {
  developerInstruction: string;
  contextualInstruction: string;
}

const OUTPUT_CONTRACT =
  "Respond ONLY with JSON matching CompanionResponse: { supportMode, message, followUp|null, closingLine|null, suggestedStep{title,description,estimatedMinutes}|null, proposedMemory{category,content,reason}|null, safety{level,message|null}, reflection{facts,interpretations,unknowns,alternativePerspectives}|null, adaptationNotice|null (always null — the application sets it), insightCandidate{theme,observation,uncertaintyStatement}|null (tentative, uncertainty-phrased, only when a real cross-conversation pattern seems present) }. No explanation of your reasoning process.";

export function composePrompt(
  context: LightContext,
  understanding: UnderstandingResult,
  reflection: ReflectionResult,
  memory: MemoryDecision,
): ComposedPrompt {
  const profile = context.companionProfile;

  const faithInvited =
    understanding.cues.includes("faith-invited") ||
    context.latestArrival?.includeFaithReflection === true;
  const faithAllowed = faithInvited || profile.faithPreference === "welcome";

  const developerInstruction = [
    buildConstitutionInstruction(understanding.supportMode),
    `Voice: tone=${profile.tonePreference}, length=${profile.responseLength}, humor=${profile.humorLevel}, encouragement=${profile.encouragementStyle}, planning=${profile.planningStyle}.`,
    faithAllowed
      ? "Faith reflection is welcome here, but never imply shared belief and never substitute faith for professional or emergency support."
      : "Do not bring faith into this response unless the user explicitly asks.",
    OUTPUT_CONTRACT,
  ].join("\n");

  const lines: string[] = [
    `Mode: ${understanding.supportMode}. Purpose: ${understanding.purpose}. Tone read: ${understanding.emotionalTone}. Action readiness: ${understanding.actionReadiness}.`,
    `Goal: ${reflection.responseGoal}.`,
    reflection.shouldOfferAction
      ? "You may offer one small step (respect planning style)."
      : "Do not offer steps or tasks.",
    reflection.shouldAskQuestion
      ? "You may ask at most one gentle question."
      : "Do not ask questions.",
  ];

  if (context.preferredName) {
    lines.push(`The user prefers to be called ${context.preferredName}.`);
  }

  if (context.latestArrival) {
    const arrival = context.latestArrival;
    lines.push(
      `Arrival today: mood=${arrival.mood}, energy=${arrival.energy}, asked for ${arrival.supportNeed}.`,
    );
  }

  if (memory.mayUseApprovedMemories && context.approvedMemories.length > 0) {
    const memories = context.approvedMemories
      .map((m) => `- (${m.category}) ${m.content}`)
      .join("\n");
    lines.push(`User-approved memories you may draw on naturally:\n${memories}`);
  }

  lines.push(
    memory.mayProposeMemory
      ? 'You may include ONE memory proposal, phrased around "Would you like me to remember that?". It is a proposal only; nothing is saved without approval.'
      : "Do not propose any memory in this response.",
  );
  lines.push(`Never store or propose: ${memory.prohibitedCategories.join(", ")}.`);

  return {
    developerInstruction,
    contextualInstruction: lines.join("\n"),
  };
}
