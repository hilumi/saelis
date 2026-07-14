import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { HorizonList } from "@/components/horizon/horizon-list";

describe("HorizonList", () => {
  it("shows a calm empty state with no productivity pressure", () => {
    render(<HorizonList steps={[]} />);
    expect(screen.getByText("Your horizon is clear.")).toBeInTheDocument();
    expect(screen.getByText(/that's a fine place to be/i)).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("renders steps with progress and toggles completion", async () => {
    const user = userEvent.setup();
    const toggle = vi.fn(async () => ({ ok: true as const }));
    render(
      <HorizonList
        steps={[
          {
            id: "s1",
            title: "Send one email",
            description: "Just the one that matters.",
            estimatedMinutes: 10,
            completed: false,
          },
        ]}
        toggleAction={toggle}
      />,
    );

    expect(
      screen.getByRole("progressbar", { name: "Horizon steps completed" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("checkbox", { name: /Send one email/ }));
    expect(toggle).toHaveBeenCalledWith("s1", true);
  });
});
