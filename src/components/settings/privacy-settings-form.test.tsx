import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { PrivacySettingsForm } from "@/components/settings/privacy-settings-form";

const DEFAULTS = {
  saveConversationHistory: true,
  allowCompanionMemory: true,
  allowProductAnalytics: false,
};

describe("PrivacySettingsForm", () => {
  it("renders the three privacy switches with correct defaults", () => {
    render(
      <PrivacySettingsForm
        initialValues={DEFAULTS}
        action={vi.fn(async () => ({ ok: true as const }))}
      />,
    );
    expect(screen.getByRole("switch", { name: "Save conversation history" })).toBeChecked();
    expect(screen.getByRole("switch", { name: "Allow companion memory" })).toBeChecked();
    expect(screen.getByRole("switch", { name: "Allow product analytics" })).not.toBeChecked();
  });

  it("saves changed values and confirms", async () => {
    const user = userEvent.setup();
    const action = vi.fn(async () => ({ ok: true as const }));
    render(<PrivacySettingsForm initialValues={DEFAULTS} action={action} />);

    await user.click(screen.getByRole("switch", { name: "Save conversation history" }));
    await user.click(screen.getByRole("button", { name: "Save privacy settings" }));

    expect(action).toHaveBeenCalledWith({
      saveConversationHistory: false,
      allowCompanionMemory: true,
      allowProductAnalytics: false,
    });
    expect(await screen.findByText("Privacy settings saved.")).toBeInTheDocument();
  });

  it("surfaces errors without losing the user's choices", async () => {
    const user = userEvent.setup();
    const action = vi.fn(async () => ({
      ok: false as const,
      error: "Those settings didn't save.",
    }));
    render(<PrivacySettingsForm initialValues={DEFAULTS} action={action} />);

    await user.click(screen.getByRole("switch", { name: "Allow product analytics" }));
    await user.click(screen.getByRole("button", { name: "Save privacy settings" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Those settings didn't save.");
    expect(screen.getByRole("switch", { name: "Allow product analytics" })).toBeChecked();
  });
});
