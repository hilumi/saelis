import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { OpenHorizon } from "@/components/brand/open-horizon";

describe("OpenHorizon", () => {
  it("is hidden from assistive technology when decorative", () => {
    render(<OpenHorizon />);
    const symbol = screen.getByTestId("open-horizon");
    expect(symbol).toHaveAttribute("aria-hidden", "true");
    expect(symbol).not.toHaveAttribute("role");
  });

  it("exposes an accessible name when labeled", () => {
    render(<OpenHorizon label="Saelis home" />);
    const symbol = screen.getByRole("img", { name: "Saelis home" });
    expect(symbol).not.toHaveAttribute("aria-hidden");
  });

  it("applies the requested size", () => {
    render(<OpenHorizon size={64} />);
    expect(screen.getByTestId("open-horizon")).toHaveStyle({ width: "64px", height: "64px" });
  });

  it("only animates when asked", () => {
    const { rerender } = render(<OpenHorizon />);
    expect(screen.getByTestId("open-horizon")).not.toHaveClass("open-horizon--animated");
    rerender(<OpenHorizon animated />);
    expect(screen.getByTestId("open-horizon")).toHaveClass("open-horizon--animated");
  });
});
