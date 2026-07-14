import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TheLight } from "@/components/brand/the-light";

describe("TheLight", () => {
  it("is decorative and hidden by default", () => {
    render(<TheLight />);
    const light = screen.getByTestId("the-light");
    expect(light).toHaveAttribute("aria-hidden", "true");
    expect(light).toHaveClass("the-light--resting");
  });

  it("reflects each state as a class", () => {
    const { rerender } = render(<TheLight state="listening" />);
    expect(screen.getByTestId("the-light")).toHaveClass("the-light--listening");
    rerender(<TheLight state="celebrating" />);
    expect(screen.getByTestId("the-light")).toHaveClass("the-light--celebrating");
    rerender(<TheLight state="still" />);
    expect(screen.getByTestId("the-light")).toHaveClass("the-light--still");
  });

  it("becomes a status region only when given meaning", () => {
    render(<TheLight state="listening" ariaLabel="Saelis is listening" />);
    expect(screen.getByRole("status", { name: "Saelis is listening" })).toBeInTheDocument();
  });

  it("honors the reduced-motion override", () => {
    render(<TheLight reducedMotion />);
    expect(screen.getByTestId("the-light")).toHaveClass("motion-off");
  });
});
