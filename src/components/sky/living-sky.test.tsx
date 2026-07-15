import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TheLight } from "@/components/brand/the-light";
import { LivingSky } from "@/components/sky/living-sky";
import { SkyContext, type SkyContextValue } from "@/components/sky/sky-provider";
import { useSky } from "@/components/sky/use-sky";
import { computeSkyState } from "@/lib/sky";

function at(hours: number): Date {
  return new Date(2026, 5, 15, hours, 0, 0, 0);
}

function renderSky(value: Partial<SkyContextValue> & Pick<SkyContextValue, "state">) {
  return render(
    <SkyContext.Provider value={{ reducedMotion: false, highContrast: false, ...value }}>
      <LivingSky />
    </SkyContext.Provider>,
  );
}

describe("LivingSky", () => {
  it("renders as a decorative, pointer-transparent backdrop", () => {
    renderSky({ state: computeSkyState(at(12)) });
    const sky = screen.getByTestId("living-sky");
    expect(sky).toHaveAttribute("aria-hidden", "true");
    expect(sky).toHaveClass("living-sky"); // CSS sets pointer-events: none
    expect(sky).toHaveAttribute("data-phase", "day");
  });

  it("renders the sun by day, without moon or stars", () => {
    renderSky({ state: computeSkyState(at(12)) });
    expect(screen.getByTestId("sky-sun")).toBeInTheDocument();
    expect(screen.queryByTestId("sky-moon")).not.toBeInTheDocument();
    expect(screen.queryByTestId("sky-stars")).not.toBeInTheDocument();
  });

  it("renders moon and stars at night", () => {
    renderSky({ state: computeSkyState(at(23), { seed: "no-aurora-seed-1" }) });
    expect(screen.getByTestId("sky-moon")).toBeInTheDocument();
    expect(screen.getByTestId("sky-stars")).toBeInTheDocument();
    expect(screen.queryByTestId("sky-sun")).not.toBeInTheDocument();
  });

  it("shows the aurora only when the state enables it", () => {
    renderSky({ state: computeSkyState(at(23), { forcedPhase: "night", forceAurora: true }) });
    expect(screen.getByTestId("sky-aurora")).toBeInTheDocument();
  });

  it("marks reduced motion and high contrast on the sky root", () => {
    renderSky({
      state: computeSkyState(at(12)),
      reducedMotion: true,
      highContrast: true,
    });
    const sky = screen.getByTestId("living-sky");
    expect(sky).toHaveClass("sky-reduced-motion");
    expect(sky).toHaveClass("sky-high-contrast");
  });
});

describe("The Light × sky tone", () => {
  it("borrows the sky tone as a visual class without changing its state", () => {
    render(<TheLight state="listening" skyTone="golden" />);
    const light = screen.getByTestId("the-light");
    expect(light).toHaveClass("the-light--listening");
    expect(light).toHaveClass("the-light--tone-golden");
    expect(light).toHaveAttribute("data-state", "listening");
  });

  it("treats pearl as the neutral default with no extra class", () => {
    render(<TheLight state="resting" skyTone="pearl" />);
    expect(screen.getByTestId("the-light")).not.toHaveClass("the-light--tone-pearl");
  });

  it("keeps working without any sky tone (existing API preserved)", () => {
    render(<TheLight state="celebrating" />);
    expect(screen.getByTestId("the-light")).toHaveClass("the-light--celebrating");
  });

  it("components read the tone from the global sky context", () => {
    function Probe() {
      const { state } = useSky();
      return <TheLight state="resting" skyTone={state.lightTone} />;
    }
    render(
      <SkyContext.Provider
        value={{
          state: computeSkyState(at(17)),
          reducedMotion: false,
          highContrast: false,
        }}
      >
        <Probe />
      </SkyContext.Provider>,
    );
    expect(screen.getByTestId("the-light")).toHaveClass("the-light--tone-golden");
  });
});
