import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  ConstellationsView,
  type ConstellationMemory,
} from "@/components/constellations/constellations-view";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

const ok = vi.fn(async () => ({ ok: true as const }));

function memory(
  id: string,
  kind: "constellation" | "north-star",
  content: string,
): ConstellationMemory {
  return {
    id,
    kind,
    content,
    title: null,
    positionSeed: null,
    reason: "You asked.",
    createdAt: new Date().toISOString(),
  };
}

describe("ConstellationsView", () => {
  it("shows the open-sky empty state", () => {
    render(<ConstellationsView userSeed="u1" memories={[]} createAction={ok} deleteAction={ok} />);
    expect(screen.getByText("Your sky is still open.")).toBeInTheDocument();
    expect(screen.getByText(/Memories you choose to keep will appear here/)).toBeInTheDocument();
  });

  it("renders approved memories as keyboard-accessible labeled stars", () => {
    render(
      <ConstellationsView
        userSeed="u1"
        memories={[
          memory("a", "constellation", "My dog is named Bo"),
          memory("b", "north-star", "I want to become more patient"),
        ]}
        createAction={ok}
        deleteAction={ok}
      />,
    );
    const constellationStar = screen.getByRole("button", {
      name: /Constellation: My dog is named Bo/,
    });
    const northStar = screen.getByRole("button", { name: /North Star: I want to become more/ });
    expect(constellationStar).toBeInTheDocument();
    // Shape-coded, not color-only: North Stars carry a distinct class.
    expect(northStar).toHaveClass("memory-star--north");
    expect(constellationStar).not.toHaveClass("memory-star--north");
  });

  it("opens a calm detail surface with edit/remove/reflect", async () => {
    const user = userEvent.setup();
    render(
      <ConstellationsView
        userSeed="u1"
        memories={[memory("a", "constellation", "My dog is named Bo")]}
        createAction={ok}
        deleteAction={ok}
      />,
    );
    await user.click(screen.getByRole("button", { name: /Constellation: My dog is named Bo/ }));
    // Title (dialog heading) + full content are both present once opened.
    expect(screen.getAllByText("My dog is named Bo").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("Why it may help: You asked.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reflect with Saelis" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove" })).toBeInTheDocument();
  });

  it("offers a list-view fallback", async () => {
    const user = userEvent.setup();
    render(
      <ConstellationsView
        userSeed="u1"
        memories={[memory("a", "constellation", "My dog is named Bo")]}
        createAction={ok}
        deleteAction={ok}
      />,
    );
    await user.click(screen.getByRole("button", { name: "List" }));
    expect(screen.getByText(/· Constellation/)).toBeInTheDocument();
  });
});
