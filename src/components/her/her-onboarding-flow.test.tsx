import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { HerOnboardingFlow } from "./her-onboarding-flow";

const replace = vi.fn();
const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push }),
}));

vi.mock("@/app/(app)/wellness-actions", () => ({
  saveOnboardingProgress: vi.fn(async () => ({ ok: true })),
  finishOnboarding: vi.fn(async () => ({ ok: true })),
}));

describe("HerOnboardingFlow", () => {
  it("offers all six pathways with multi-select and no auto-selection", () => {
    render(
      <HerOnboardingFlow initialState={{ currentStep: "pathways", data: {}, completedAt: null }} />,
    );
    for (const name of ["Phoenix", "Restore", "Strong", "Nourish", "Rhythm", "Reset"]) {
      expect(screen.getByRole("button", { name: new RegExp(name) })).toHaveAttribute(
        "aria-pressed",
        "false",
      );
    }
  });

  it("selects multiple pathways together", async () => {
    const user = userEvent.setup();
    render(
      <HerOnboardingFlow initialState={{ currentStep: "pathways", data: {}, completedAt: null }} />,
    );
    await user.click(screen.getByRole("button", { name: /Strong/ }));
    await user.click(screen.getByRole("button", { name: /Nourish/ }));
    expect(screen.getByRole("button", { name: /Strong/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /Nourish/ })).toHaveAttribute("aria-pressed", "true");
  });

  it("shows no postpartum language when Restore is not selected", () => {
    render(
      <HerOnboardingFlow
        initialState={{
          currentStep: "goals",
          data: { pathways: ["strong", "nourish"] },
          completedAt: null,
        }}
      />,
    );
    expect(document.body.textContent).not.toMatch(/postpartum|pelvic|delivery|c-section/i);
    // The step list has no Restore step either.
    expect(screen.getByText(/Step 3 of 8/)).toBeInTheDocument();
  });

  it("offers postpartum goals and the Restore step when Restore is selected", () => {
    render(
      <HerOnboardingFlow
        initialState={{
          currentStep: "goals",
          data: { pathways: ["restore"] },
          completedAt: null,
        }}
      />,
    );
    expect(screen.getByText("Support postpartum recovery")).toBeInTheDocument();
    expect(screen.getByText(/Step 3 of 9/)).toBeInTheDocument();
  });

  it("renders the Restore intake with non-diagnostic safety context", () => {
    render(
      <HerOnboardingFlow
        initialState={{
          currentStep: "restore",
          data: { pathways: ["restore"] },
          completedAt: null,
        }}
      />,
    );
    expect(
      screen.getByText(/Postpartum timing alone does not establish exercise readiness/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Nothing here diagnoses anything/)).toBeInTheDocument();
    // Clearance defaults to unknown → education-only notice is visible.
    expect(screen.getByText(/no.*unrestricted exercise plans|no\s+unrestricted/i)).toBeDefined();
  });

  it("keeps every answer when navigating backward", async () => {
    const user = userEvent.setup();
    render(
      <HerOnboardingFlow
        initialState={{
          currentStep: "goals",
          data: {
            pathways: ["strong"],
            goals: { goalTypes: ["strength"], primaryGoal: "strength" },
          },
          completedAt: null,
        }}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Back" }));
    // Back to pathways — Strong is still selected.
    expect(screen.getByRole("button", { name: /Strong/ })).toHaveAttribute("aria-pressed", "true");
  });

  it("announces step progress for screen readers", () => {
    render(
      <HerOnboardingFlow initialState={{ currentStep: "welcome", data: {}, completedAt: null }} />,
    );
    expect(screen.getByText(/Step 1 of 8: Welcome/)).toBeInTheDocument();
  });
});
