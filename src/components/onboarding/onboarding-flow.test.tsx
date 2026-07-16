import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";

const push = vi.fn();
const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("OnboardingFlow — four brief screens, always skippable", () => {
  it("walks four screens: what Saelis is, AI disclosure, voice, begin", async () => {
    const action = vi.fn(async () => ({ ok: true }) as const);
    const user = userEvent.setup();
    render(<OnboardingFlow action={action} />);

    expect(screen.getByText("1 of 4")).toBeInTheDocument();
    expect(screen.getByText(/A quiet place of your own/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Next" }));
    // AI disclosure: clearly states AI and fallibility, and points to crisis help.
    expect(screen.getByText(/Saelis is AI — and honest about it/)).toBeInTheDocument();
    expect(screen.getByText(/can misunderstand you/)).toBeInTheDocument();
    expect(screen.getByText(/988/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText(/How should Saelis speak with you\?/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("4 of 4")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Begin" })).toBeInTheDocument();
  });

  it("completes with the chosen directness and humor preference", async () => {
    const action = vi.fn(async () => ({ ok: true }) as const);
    const user = userEvent.setup();
    render(<OnboardingFlow action={action} />);

    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(screen.getByRole("button", { name: /^Direct/ }));
    await user.click(screen.getByRole("button", { name: /No humor, please/ }));
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(screen.getByRole("button", { name: "Begin" }));

    expect(action).toHaveBeenCalledWith({ tonePreference: "direct", humorWelcome: false });
    expect(push).toHaveBeenCalledWith("/home");
  });

  it("Skip exists on every screen and completes without imposing choices", async () => {
    const action = vi.fn(async () => ({ ok: true }) as const);
    const user = userEvent.setup();
    render(<OnboardingFlow action={action} />);

    expect(screen.getByRole("button", { name: "Skip" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByRole("button", { name: "Skip" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Skip" }));
    expect(action).toHaveBeenCalledWith({});
    expect(push).toHaveBeenCalledWith("/home");
  });

  it("shows a calm error and stays put when completion fails", async () => {
    const action = vi.fn(async () => ({ ok: false, error: "That didn't save." }) as const);
    const user = userEvent.setup();
    render(<OnboardingFlow action={action} />);

    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(screen.getByRole("button", { name: "Begin" }));

    expect(await screen.findByText("That didn't save.")).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });
});
