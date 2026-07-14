import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CompanionSettingsForm } from "@/components/settings/companion-settings-form";
import { DEFAULT_COMPANION_PREFERENCES } from "@/lib/companion-defaults";

describe("CompanionSettingsForm", () => {
  it("renders every preference control", () => {
    render(
      <CompanionSettingsForm
        initialPreferredName="Sophie"
        initialPreferences={DEFAULT_COMPANION_PREFERENCES}
        action={vi.fn(async () => ({ ok: true as const }))}
      />,
    );
    expect(screen.getByLabelText("What should Saelis call you?")).toHaveValue("Sophie");
    expect(screen.getByLabelText("Tone")).toHaveValue("balanced");
    expect(screen.getByLabelText("Response length")).toHaveValue("moderate");
    expect(screen.getByLabelText("Default support")).toHaveValue("listen-first");
    expect(screen.getByLabelText("Humor")).toHaveValue("light");
    expect(screen.getByLabelText("Faith reflection")).toHaveValue("ask");
    expect(screen.getByLabelText("Planning style")).toHaveValue("one-step");
    expect(screen.getByLabelText("Encouragement")).toHaveValue("warm");
    expect(screen.getByRole("switch", { name: "Adaptive learning" })).toBeChecked();
  });

  it("submits updated values and shows success feedback", async () => {
    const user = userEvent.setup();
    const action = vi.fn(async () => ({ ok: true as const }));
    render(
      <CompanionSettingsForm
        initialPreferredName=""
        initialPreferences={DEFAULT_COMPANION_PREFERENCES}
        action={action}
      />,
    );

    await user.type(screen.getByLabelText("What should Saelis call you?"), "Sophie");
    await user.selectOptions(screen.getByLabelText("Tone"), "gentle");
    await user.click(screen.getByRole("switch", { name: "Adaptive learning" }));
    await user.click(screen.getByRole("button", { name: "Save preferences" }));

    expect(action).toHaveBeenCalledWith({
      preferredName: "Sophie",
      preferences: {
        ...DEFAULT_COMPANION_PREFERENCES,
        tonePreference: "gentle",
        adaptiveLearningEnabled: false,
      },
    });
    expect(await screen.findByText(/Saved/)).toBeInTheDocument();
  });

  it("shows a calm error when saving fails", async () => {
    const user = userEvent.setup();
    const action = vi.fn(async () => ({ ok: false as const, error: "That didn't save." }));
    render(
      <CompanionSettingsForm
        initialPreferredName=""
        initialPreferences={DEFAULT_COMPANION_PREFERENCES}
        action={action}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Save preferences" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("That didn't save.");
  });
});
