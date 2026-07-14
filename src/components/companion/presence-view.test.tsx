import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { PresenceView } from "@/components/companion/presence-view";

describe("PresenceView (Stay Here)", () => {
  it("offers presence with no productivity pressure", () => {
    render(<PresenceView />);
    expect(screen.getByText("You don't have to do anything right now.")).toBeInTheDocument();
    expect(screen.getByText(/Nothing is being measured/)).toBeInTheDocument();
    // No timers, counters, or progress indicators here.
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(screen.queryByRole("timer")).not.toBeInTheDocument();
  });

  it("offers a gentle word on request", async () => {
    const user = userEvent.setup();
    render(<PresenceView />);
    await user.click(screen.getByRole("button", { name: "A gentle word" }));
    expect(screen.getByText("Being here is enough.")).toBeInTheDocument();
  });

  it("lets the user leave when ready, without urgency", () => {
    render(<PresenceView />);
    const leave = screen.getByRole("link", { name: /When you're ready/ });
    expect(leave).toHaveAttribute("href", "/conversation");
  });
});
