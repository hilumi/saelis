import { DEFAULT_COMPANION_PREFERENCES } from "@/lib/companion-defaults";

import type { LightContext } from "@/lib/light/types";

/** Test fixture: a minimal, valid LightContext with overridable fields. */
export function makeLightContext(overrides: Partial<LightContext> = {}): LightContext {
  return {
    userId: "00000000-0000-4000-8000-000000000001",
    message: "hello",
    recentTurns: [],
    companionProfile: DEFAULT_COMPANION_PREFERENCES,
    approvedMemories: [],
    privacy: { saveConversationHistory: true, allowCompanionMemory: true },
    ...overrides,
  };
}
