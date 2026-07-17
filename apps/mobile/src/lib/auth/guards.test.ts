import { describe, expect, it } from "vitest";

import { guardAuthGroup, guardProtectedGroup } from "./guards";

describe("guardProtectedGroup", () => {
  it("shows the launch state while loading — no protected-content flash", () => {
    expect(guardProtectedGroup("loading")).toEqual({ kind: "launch" });
  });

  it("redirects signed-out users to sign-in", () => {
    expect(guardProtectedGroup("signedOut")).toEqual({
      kind: "redirect",
      href: "/(auth)/sign-in",
    });
  });

  it("renders for signed-in users", () => {
    expect(guardProtectedGroup("signedIn")).toEqual({ kind: "render" });
  });
});

describe("guardAuthGroup", () => {
  it("shows the launch state while loading", () => {
    expect(guardAuthGroup("loading")).toEqual({ kind: "launch" });
  });

  it("redirects signed-in users into the app — never left on auth screens", () => {
    expect(guardAuthGroup("signedIn")).toEqual({ kind: "redirect", href: "/(app)/(tabs)" });
  });

  it("renders for signed-out users", () => {
    expect(guardAuthGroup("signedOut")).toEqual({ kind: "render" });
  });
});
