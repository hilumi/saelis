import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CommunicationAdaptationSection } from "@/components/settings/communication-adaptation-section";

import type { AdaptivePreference } from "@/lib/core/types";

function preference(overrides: Partial<AdaptivePreference> = {}): AdaptivePreference {
  return {
    id: "00000000-0000-4000-8000-00000000dddd",
    key: "prefers-concise-when-overwhelmed",
    value: {},
    confidence: 0.8,
    evidenceCount: 4,
    status: "active",
    firstObservedAt: "2026-06-01T00:00:00Z",
    lastObservedAt: "2026-07-10T00:00:00Z",
    expiresAt: null,
    ...overrides,
  };
}

describe("How we communicate — visible, editable, resettable", () => {
  it("shows a friendly summary, never a raw score", () => {
    const { container } = render(
      <CommunicationAdaptationSection preferences={[preference()]} previewMode />,
    );
    expect(
      screen.getByText("Saelis has been keeping responses shorter when things feel crowded."),
    ).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/0\.8|confidence|score/i);
  });

  it("offers keep / adjust / reset / stop controls", () => {
    render(<CommunicationAdaptationSection preferences={[preference()]} previewMode />);
    expect(screen.getByText("Keep this")).toBeInTheDocument();
    expect(screen.getByText("Adjust")).toBeInTheDocument();
    expect(screen.getByText("Reset")).toBeInTheDocument();
    expect(screen.getByText("Stop adapting this way")).toBeInTheDocument();
  });

  it("calls the decide action with the chosen control", async () => {
    const user = userEvent.setup();
    const decide = vi.fn(async () => ({ ok: true }) as const);
    render(<CommunicationAdaptationSection preferences={[preference()]} decideAction={decide} />);
    await user.click(screen.getByText("Stop adapting this way"));
    expect(decide).toHaveBeenCalledWith({
      preferenceId: preference().id,
      decision: "stop",
    });
  });

  it("shows a quiet empty state when nothing has been adapted", () => {
    render(<CommunicationAdaptationSection preferences={[]} previewMode />);
    expect(screen.getByText(/Nothing yet\./)).toBeInTheDocument();
  });

  it("offers a full reset when anything exists", () => {
    render(<CommunicationAdaptationSection preferences={[preference()]} previewMode />);
    expect(screen.getByText("Clear everything Saelis has adapted")).toBeInTheDocument();
  });
});
