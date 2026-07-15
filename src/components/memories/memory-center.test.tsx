import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { MemoryCenter, type MemoryCardData } from "@/components/memories/memory-center";

const ok = vi.fn(async () => ({ ok: true as const }));
const exportOk = vi.fn(async () => ({
  ok: true as const,
  exportedAt: "2026-07-15T00:00:00.000Z",
  memories: [],
}));

function card(id: string, overrides: Partial<MemoryCardData> = {}): MemoryCardData {
  return {
    id,
    kind: "constellation",
    title: null,
    content: `content ${id}`,
    reason: "You asked.",
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-02T00:00:00.000Z",
    active: true,
    ...overrides,
  };
}

function renderCenter(memories: MemoryCardData[]) {
  return render(
    <MemoryCenter
      memories={memories}
      updateAction={ok}
      deleteAction={ok}
      clearAllAction={ok}
      exportAction={exportOk}
    />,
  );
}

describe("MemoryCenter", () => {
  it("shows the empty state when nothing is remembered", () => {
    renderCenter([]);
    expect(screen.getByText("Nothing is remembered yet.")).toBeInTheDocument();
  });

  it("searches and filters by kind", async () => {
    const user = userEvent.setup();
    renderCenter([
      card("a", { content: "My dog is named Bo" }),
      card("b", { kind: "north-star", content: "Become more patient" }),
    ]);
    await user.click(screen.getByRole("button", { name: "North Stars" }));
    expect(screen.queryByText("My dog is named Bo")).not.toBeInTheDocument();
    expect(screen.getByText("Become more patient")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "All" }));
    await user.type(screen.getByLabelText("Search memories"), "dog");
    expect(screen.getByText("My dog is named Bo")).toBeInTheDocument();
    expect(screen.queryByText("Become more patient")).not.toBeInTheDocument();
  });

  it("edits through a dialog and submits the changed kind", async () => {
    const user = userEvent.setup();
    renderCenter([card("a", { content: "My dog is named Bo" })]);
    await user.click(screen.getByRole("button", { name: "Edit" }));
    await user.selectOptions(screen.getByLabelText("Kind"), "north-star");
    await user.click(screen.getByRole("button", { name: "Keep changes" }));
    expect(ok).toHaveBeenCalledWith(expect.objectContaining({ memoryId: "a", kind: "north-star" }));
  });

  it("requires confirmation before removing and clearing", async () => {
    const user = userEvent.setup();
    renderCenter([card("a")]);
    await user.click(screen.getByRole("button", { name: "Remove" }));
    expect(screen.getByText(/stop Saelis from using it/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Clear all memories" }));
    expect(screen.getByText(/cannot be undone/)).toBeInTheDocument();
  });

  it("offers a clearly labeled export control", () => {
    renderCenter([card("a")]);
    expect(screen.getByRole("button", { name: "Export memories (JSON)" })).toBeInTheDocument();
  });
});
