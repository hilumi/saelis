import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { InsightsView } from "@/components/insights/insights-view";

import type { PatternHypothesis } from "@/lib/core/types";

function hypothesis(overrides: Partial<PatternHypothesis> = {}): PatternHypothesis {
  return {
    id: "00000000-0000-4000-8000-00000000cccc",
    theme: "boundaries",
    observation:
      "I've noticed that your own needs sometimes seem to become secondary when conflict appears.",
    uncertaintyStatement: "I don't know why this happens, and there may be several explanations.",
    confidence: 0.7,
    evidenceCount: 4,
    crossDomainCount: 2,
    status: "reviewable",
    firstObservedAt: "2026-06-01T00:00:00Z",
    lastObservedAt: "2026-07-10T00:00:00Z",
    evidence: [
      {
        id: "e1",
        sourceType: "conversation",
        occurredAt: "2026-06-01T00:00:00Z",
        summary: "Noticed during a communicate moment in conversation.",
      },
    ],
    ...overrides,
  };
}

describe("InsightsView — quiet, reviewable, user-controlled", () => {
  it("shows a calm empty state, never an alert feed", () => {
    render(<InsightsView hypotheses={[]} previewMode />);
    expect(screen.getByText("Nothing waiting here")).toBeInTheDocument();
  });

  it("renders observation, uncertainty, and why it was surfaced", () => {
    render(<InsightsView hypotheses={[hypothesis()]} previewMode />);
    expect(
      screen.getByText(/your own needs sometimes seem to become secondary/),
    ).toBeInTheDocument();
    expect(screen.getByText(/there may be several explanations/)).toBeInTheDocument();
    expect(screen.getByText(/appeared more than once/)).toBeInTheDocument();
  });

  it("never shows raw confidence numbers or percentages", () => {
    const { container } = render(<InsightsView hypotheses={[hypothesis()]} previewMode />);
    expect(container.textContent).not.toMatch(/0\.\d+|%|confidence/i);
  });

  it("lets the user inspect content-free evidence", async () => {
    const user = userEvent.setup();
    render(<InsightsView hypotheses={[hypothesis()]} previewMode />);
    await user.click(screen.getByText("Show me what you noticed"));
    expect(
      screen.getByText(/Noticed during a communicate moment in conversation\./),
    ).toBeInTheDocument();
  });

  it("offers all four decisions and calls the action with the choice", async () => {
    const user = userEvent.setup();
    const action = vi.fn(async () => ({ ok: true }) as const);
    render(<InsightsView hypotheses={[hypothesis()]} action={action} />);

    expect(screen.getByText("Explore")).toBeInTheDocument();
    expect(screen.getByText("Not now")).toBeInTheDocument();
    expect(screen.getByText("This doesn't fit")).toBeInTheDocument();
    expect(screen.getByText("Don't look for this again")).toBeInTheDocument();

    await user.click(screen.getByText("This doesn't fit"));
    expect(action).toHaveBeenCalledWith({
      hypothesisId: hypothesis().id,
      decision: "does-not-fit",
      theme: "boundaries",
    });
  });
});
