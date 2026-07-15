import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { HomeView } from "@/components/home/home-view";

import type { HomeData } from "@/lib/home/loader";

const EMPTY: HomeData = {
  preferredName: null,
  latestArrival: null,
  horizon: { activeCount: 0, completedTodayCount: 0, nextStep: null },
  memories: { constellationCount: 0, northStarCount: 0 },
  hasRecentConversation: false,
  privacy: { saveConversationHistory: true, allowCompanionMemory: true },
  continuation: null,
};

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe("HomeView", () => {
  it("renders the sanctuary with all four primary doors and calm empty states", () => {
    render(<HomeView data={EMPTY} />);
    expect(screen.getByRole("navigation", { name: "Begin" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Talk/ })).toHaveAttribute("href", "/conversation");
    expect(screen.getByRole("link", { name: /Arrive/ })).toHaveAttribute("href", "/arrival");
    expect(screen.getByRole("link", { name: /Stay Here/ })).toHaveAttribute("href", "/stay-here");
    expect(screen.getByRole("link", { name: /Find one step/ })).toHaveAttribute(
      "href",
      "/guidance",
    );
    expect(screen.getByText("The horizon is open.")).toBeInTheDocument();
    expect(screen.getByText(/Your sky is still open/)).toBeInTheDocument();
    // No streaks, counts of absence, or guilt anywhere.
    expect(document.body.textContent).not.toMatch(/streak|missed you|days? (ago|absent)/i);
  });

  it("greets by preferred name once mounted, and 'Welcome.' without one", async () => {
    render(<HomeView data={{ ...EMPTY, preferredName: "Sophia" }} />);
    expect(await screen.findByText(/Sophia\.|You made it here\./)).toBeInTheDocument();
  });

  it("shows at most one dismissible continuation without private content", async () => {
    const user = userEvent.setup();
    render(
      <HomeView
        data={{
          ...EMPTY,
          hasRecentConversation: true,
          continuation: {
            type: "conversation",
            label: "Continue where you left off.",
            detail: null,
            href: "/conversation",
          },
        }}
      />,
    );
    expect(screen.getByText("Continue where you left off.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Not now" }));
    expect(screen.queryByText("Continue where you left off.")).not.toBeInTheDocument();
    expect(sessionStorage.getItem("saelis-home-dismissed")).toBe("true");
  });

  it("glimpses the horizon with one step and no shame language", () => {
    render(
      <HomeView
        data={{
          ...EMPTY,
          horizon: {
            activeCount: 3,
            completedTodayCount: 1,
            nextStep: { id: "s1", title: "Water the ferns", estimatedMinutes: 10 },
          },
        }}
      />,
    );
    expect(screen.getByText("Water the ferns")).toBeInTheDocument();
    expect(screen.getByText("about 10 minutes")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Begin" })).toHaveAttribute("href", "/horizon");
    expect(document.body.textContent).not.toMatch(/overdue|late|behind/i);
  });

  it("glimpses constellations as counts only — never memory content", () => {
    render(
      <HomeView data={{ ...EMPTY, memories: { constellationCount: 3, northStarCount: 1 } }} />,
    );
    expect(screen.getByText(/holds 4 memories you chose to keep/)).toBeInTheDocument();
    expect(screen.getByText(/including 1 North Star/)).toBeInTheDocument();
  });

  it("respects memory-disabled privacy with a supportive line", () => {
    render(
      <HomeView
        data={{
          ...EMPTY,
          privacy: { saveConversationHistory: true, allowCompanionMemory: false },
        }}
      />,
    );
    expect(
      screen.getByText("Saelis will support you without retained memories."),
    ).toBeInTheDocument();
  });

  it("offers Last Light groundwork: one quiet line on stepping away, never a modal", async () => {
    const user = userEvent.setup();
    render(<HomeView data={EMPTY} />);
    await user.click(screen.getByRole("button", { name: "Step away for now" }));
    const line = await screen.findByRole("status");
    expect(line.textContent).toMatch(
      /Take only what feels useful\.|One clear step is enough\.|May the rest of today meet you gently\.|A little lighter\./,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("marks first visits and long returns with gentle copy only", async () => {
    render(<HomeView data={EMPTY} />);
    expect(await screen.findByText("Welcome to a quiet place of your own.")).toBeInTheDocument();
  });

  it("labels development previews clearly", () => {
    render(<HomeView data={EMPTY} preview="horizon" />);
    expect(screen.getByText(/Development preview: horizon/)).toBeInTheDocument();
    expect(screen.getByText("Water the ferns")).toBeInTheDocument();
  });
});
