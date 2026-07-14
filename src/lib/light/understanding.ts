import { runSafetyPreCheck } from "@/lib/ai/safety";

import type {
  ActionReadiness,
  ConversationPurpose,
  EmotionalTone,
  LightContext,
  SupportMode,
  UnderstandingResult,
} from "@/lib/light/types";

/**
 * Understanding — deterministic, transparent heuristics.
 *
 * IMPORTANT: this module does not create genuine emotional comprehension.
 * It reads explicit user language with ordinary pattern matching. These
 * heuristics will later be supplemented or replaced by validated provider
 * classification, but the routing rules here (explicit intent wins, distress
 * never defaults to action, urgent safety overrides everything) remain the
 * contract that any future classifier must satisfy.
 */

interface Rule {
  cue: string;
  pattern: RegExp;
  purpose: ConversationPurpose;
  supportMode: SupportMode;
  tone: EmotionalTone;
  readiness: ActionReadiness;
  confidence: number;
}

/**
 * Ordered rules — first match wins. Explicit user intent is checked before
 * inferred emotional cues, so "I just need to vent" can never become a plan.
 */
const RULES: Rule[] = [
  // --- explicit intent -----------------------------------------------------
  {
    cue: "explicit-no-advice",
    pattern: /(don'?t|do not|not) (want|looking for|need) (any )?(advice|solutions|fixing)/i,
    purpose: "seek-comfort",
    supportMode: "comfort",
    tone: "heavy",
    readiness: "not-ready",
    confidence: 0.95,
  },
  {
    cue: "explicit-vent",
    pattern: /(need|want) to vent|just (need|want) to (vent|say this|get this out)|let me vent/i,
    purpose: "vent",
    supportMode: "witness",
    tone: "heavy",
    readiness: "not-ready",
    confidence: 0.95,
  },
  {
    cue: "explicit-presence",
    pattern: /\b(stay|sit|be) (here )?with me|just be (here|there)|keep me company/i,
    purpose: "seek-presence",
    supportMode: "presence",
    tone: "heavy",
    readiness: "not-ready",
    confidence: 0.95,
  },
  {
    cue: "communication-writing",
    pattern:
      /help me (write|draft|word|phrase)|how (do|should) i (tell|say to)|write a (message|letter|text|email) to/i,
    purpose: "communicate",
    supportMode: "connect",
    tone: "uncertain",
    readiness: "ready",
    confidence: 0.9,
  },
  {
    cue: "decision-language",
    pattern:
      /can'?t (decide|choose)|torn between|whether to \w+ or|should i (stay|leave|go|quit|take|say)/i,
    purpose: "make-decision",
    supportMode: "clarify",
    tone: "uncertain",
    readiness: "uncertain",
    confidence: 0.9,
  },
  {
    cue: "explicit-action",
    pattern:
      /give me (\w+ )?steps?|make (me )?a plan|what('s| is) (my |the )?next step|figure out what to do|what should i do next|where do i start/i,
    purpose: "seek-plan",
    supportMode: "act",
    tone: "neutral",
    readiness: "explicitly-requested",
    confidence: 0.9,
  },
  {
    cue: "memory-request",
    pattern: /(remember|don'?t forget) (that|this)\b/i,
    purpose: "process",
    supportMode: "reflect",
    tone: "neutral",
    readiness: "uncertain",
    confidence: 0.9,
  },
  // --- celebration ----------------------------------------------------------
  {
    cue: "celebration-relief",
    pattern: /i'?m so relieved|what a relief/i,
    purpose: "celebrate",
    supportMode: "celebrate",
    tone: "hopeful",
    readiness: "not-ready",
    confidence: 0.85,
  },
  {
    cue: "celebration",
    pattern: /i did it|we did it|got the job|i passed|good news|i'?m so (proud|happy|excited)/i,
    purpose: "celebrate",
    supportMode: "celebrate",
    tone: "joyful",
    readiness: "not-ready",
    confidence: 0.9,
  },
  // --- reflection & faith ----------------------------------------------------
  {
    cue: "reflective-language",
    pattern:
      /want to understand why|keeps affecting me|make sense of|what (does|did) (this|it) mean/i,
    purpose: "reflect",
    supportMode: "reflect",
    tone: "uncertain",
    readiness: "uncertain",
    confidence: 0.85,
  },
  {
    cue: "faith-invited",
    pattern: /pray (with|for) me|would you pray|\bpray together\b/i,
    purpose: "reflect",
    supportMode: "reflect",
    tone: "heavy",
    readiness: "not-ready",
    confidence: 0.9,
  },
  // --- inferred emotional cues (never routed to action) ----------------------
  {
    cue: "grief",
    pattern: /grie(f|ving)|heartbroken|lost (my|someone)|passed away|crying|so sad/i,
    purpose: "seek-comfort",
    supportMode: "comfort",
    tone: "heavy",
    readiness: "not-ready",
    confidence: 0.75,
  },
  {
    cue: "exhaustion",
    pattern: /exhausted|so tired|drained|running on empty|burn(ed|t) out/i,
    purpose: "seek-comfort",
    supportMode: "comfort",
    tone: "heavy",
    readiness: "not-ready",
    confidence: 0.7,
  },
  {
    cue: "distress",
    pattern: /awful|terrible|unappreciated|fed up|overwhelmed|falling apart/i,
    purpose: "vent",
    supportMode: "witness",
    tone: "heavy",
    readiness: "not-ready",
    confidence: 0.7,
  },
  {
    cue: "anger",
    pattern: /furious|so angry|makes me (mad|angry)|sick of/i,
    purpose: "process",
    supportMode: "witness",
    tone: "distressed",
    readiness: "not-ready",
    confidence: 0.7,
  },
  {
    cue: "shame",
    pattern: /ashamed|embarrass(ed|ing)|i'?m (such )?(a|an) (failure|idiot)|hate myself/i,
    purpose: "seek-comfort",
    supportMode: "comfort",
    tone: "distressed",
    readiness: "not-ready",
    confidence: 0.75,
  },
  {
    cue: "uncertainty",
    pattern: /not sure|no idea|confused|don'?t know (what|how|where)/i,
    purpose: "seek-clarity",
    supportMode: "explore",
    tone: "uncertain",
    readiness: "uncertain",
    confidence: 0.6,
  },
];

export function createUnderstanding(context: LightContext): UnderstandingResult {
  // Normalize typographic apostrophes so "can’t" matches "can't" patterns.
  const message = context.message.replace(/[‘’]/g, "'");
  const safety = runSafetyPreCheck(message);

  // Urgent safety overrides every ordinary mode.
  if (safety.level === "urgent") {
    return {
      purpose: "unknown",
      supportMode: "presence",
      emotionalTone: "distressed",
      actionReadiness: "not-ready",
      confidence: 1,
      cues: ["urgent-safety"],
      requiresClarification: false,
      safetyLevel: "urgent",
    };
  }

  const matched = RULES.filter((rule) => rule.pattern.test(message));
  const primary = matched[0];

  if (!primary) {
    // Low confidence: favor a gentle, curious response over any plan.
    return {
      purpose: "unknown",
      supportMode: "explore",
      emotionalTone: safety.level === "support" ? "distressed" : "neutral",
      actionReadiness: "uncertain",
      confidence: 0.4,
      cues: safety.level === "support" ? ["support-safety"] : [],
      requiresClarification: true,
      safetyLevel: safety.level,
    };
  }

  return {
    purpose: primary.purpose,
    supportMode: primary.supportMode,
    emotionalTone: safety.level === "support" ? "distressed" : primary.tone,
    actionReadiness: primary.readiness,
    confidence: primary.confidence,
    cues: [
      ...matched.map((rule) => rule.cue),
      ...(safety.level === "support" ? ["support-safety"] : []),
    ],
    requiresClarification: primary.confidence < 0.5,
    safetyLevel: safety.level,
  };
}
