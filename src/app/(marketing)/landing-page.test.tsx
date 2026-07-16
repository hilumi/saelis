import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import MarketingPage, { metadata } from "@/app/(marketing)/page";

describe("private beta landing page", () => {
  it("has exactly one H1 with the hero heading", () => {
    render(<MarketingPage />);
    const headings = screen.getAllByRole("heading", { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent("Meet Saelis.");
    expect(headings[0]).toHaveTextContent("A reflection companion for life's complicated moments.");
  });

  it("shows the private-beta label and supporting copy", () => {
    render(<MarketingPage />);
    expect(screen.getByText("Private Beta")).toBeInTheDocument();
    expect(
      screen.getByText(/think more clearly, feel understood, consider another perspective/),
    ).toBeInTheDocument();
  });

  it("routes the primary action to sign-up and the secondary to sign-in", () => {
    render(<MarketingPage />);
    expect(screen.getByRole("link", { name: "Begin with Saelis" })).toHaveAttribute(
      "href",
      "/sign-up",
    );
    expect(screen.getByRole("link", { name: "Create an account" })).toHaveAttribute(
      "href",
      "/sign-up",
    );
    for (const signIn of screen.getAllByRole("link", { name: "Sign in" })) {
      expect(signIn).toHaveAttribute("href", "/sign-in");
    }
    expect(screen.getAllByRole("link", { name: "Sign in" }).length).toBeGreaterThanOrEqual(2);
  });

  it("carries the founder welcome with signature and no 'co-founder' language", () => {
    const { container } = render(<MarketingPage />);
    expect(screen.getByText("Welcome to the earliest chapter of Saelis.")).toBeInTheDocument();
    expect(
      screen.getByText(/calm place to bring the things life puts in front of you/),
    ).toBeInTheDocument();
    expect(screen.getByText("Sophia Greene")).toBeInTheDocument();
    expect(screen.getByText("Founder, Saelis")).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/co-founder/i);
  });

  it("discloses plainly that Saelis is AI and may misunderstand", () => {
    render(<MarketingPage />);
    expect(screen.getByText(/Saelis is an AI system\. It may misunderstand/)).toBeInTheDocument();
    expect(
      screen.getByText(/never replace emergency, medical, legal, or mental-health professionals/),
    ).toBeInTheDocument();
  });

  it("links the four trust pages from the restraint section", () => {
    render(<MarketingPage />);
    const nav = screen.getByRole("navigation", { name: "Trust pages" });
    const links = Array.from(nav.querySelectorAll("a")).map((anchor) =>
      anchor.getAttribute("href"),
    );
    expect(links).toEqual(["/privacy", "/terms", "/ai-disclosure", "/support"]);
  });

  it("shows the restraint commitments and beta expectations", () => {
    render(<MarketingPage />);
    expect(screen.getByText("Built with restraint.")).toBeInTheDocument();
    expect(screen.getByText("Saelis does not sell personal data.")).toBeInTheDocument();
    expect(screen.getByText("You are helping shape Saelis.")).toBeInTheDocument();
    expect(screen.getByText(/more valuable than praise/)).toBeInTheDocument();
    expect(screen.getByText("Come as you are.")).toBeInTheDocument();
    expect(screen.getByText("There is no perfect way to begin.")).toBeInTheDocument();
  });

  it("makes no therapy, diagnosis, treatment, or guaranteed-outcome claims", () => {
    const { container } = render(<MarketingPage />);
    const text = container.textContent ?? "";
    expect(text).not.toMatch(/\btherap/i);
    expect(text).not.toMatch(/\bdiagnos/i);
    expect(text).not.toMatch(/\btreatment\b/i);
    expect(text).not.toMatch(/\bcure\b|\bheal(s|ing)?\b/i);
    expect(text).not.toMatch(/guarantee/i);
    // And no fabricated social proof.
    expect(text).not.toMatch(/\d+[,.]?\d*\s*(users|members|people trust)/i);
  });

  it("keeps heading order logical (single h1, then h2 sections, h3 within)", () => {
    render(<MarketingPage />);
    const levels = screen
      .getAllByRole("heading")
      .map((heading) => Number(heading.tagName.slice(1)));
    expect(levels[0]).toBe(1);
    // No heading jumps by more than one level.
    for (let index = 1; index < levels.length; index += 1) {
      expect((levels[index] as number) - (levels[index - 1] as number)).toBeLessThanOrEqual(1);
    }
  });

  it("uses mobile-safe structure: wrapping CTAs, bounded widths, tappable links", () => {
    const { container } = render(<MarketingPage />);
    // CTA rows wrap rather than overflow at 320px.
    expect(container.querySelectorAll(".flex-wrap").length).toBeGreaterThanOrEqual(2);
    // Content columns are width-bounded.
    expect(container.querySelectorAll("[class*='max-w-']").length).toBeGreaterThanOrEqual(4);
    // Every link keeps the 44px minimum touch target.
    for (const anchor of Array.from(container.querySelectorAll("a"))) {
      expect(anchor.className).toContain("min-h-11");
    }
  });

  it("keeps The Light decorative (hidden from assistive technology)", () => {
    const { container } = render(<MarketingPage />);
    const lights = container.querySelectorAll("[data-testid='the-light']");
    expect(lights.length).toBeGreaterThanOrEqual(1);
    for (const light of Array.from(lights)) {
      expect(light.getAttribute("role")).toBeNull();
    }
  });

  it("exports the beta SEO metadata", () => {
    expect(metadata.title).toEqual({ absolute: "Saelis — A Reflection Companion" });
    expect(metadata.description).toContain("AI reflection companion");
  });
});
