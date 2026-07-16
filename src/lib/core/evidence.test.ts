import { describe, expect, it } from "vitest";

import {
  createEvidenceReference,
  evidenceSummaryForCue,
  knownEvidenceCues,
} from "@/lib/core/evidence";

describe("evidence — content-free by construction", () => {
  it("creates references only for known cues", () => {
    const reference = createEvidenceReference("conversation", "explicit-concise");
    expect(reference).not.toBeNull();
    expect(reference?.summary).toBe("You explicitly asked for shorter responses.");
    expect(createEvidenceReference("conversation", "some-unknown-cue")).toBeNull();
  });

  it("every summary in the catalog is a fixed sentence, never a template slot", () => {
    for (const cue of knownEvidenceCues()) {
      const summary = evidenceSummaryForCue(cue);
      expect(summary).toBeTruthy();
      expect(summary).not.toMatch(/\$\{|\{\{|%s/);
      expect((summary as string).length).toBeLessThanOrEqual(120);
    }
  });

  it("summaries never quote user content because they cannot — no content input exists", () => {
    const reference = createEvidenceReference(
      "conversation",
      "explicit-directness",
      "2026-07-01T00:00:00Z",
    );
    expect(reference?.occurredAt).toBe("2026-07-01T00:00:00Z");
    expect(reference?.sourceType).toBe("conversation");
  });
});
