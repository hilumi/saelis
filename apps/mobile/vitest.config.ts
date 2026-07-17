import { defineConfig } from "vitest/config";

/**
 * Mobile unit tests cover the pure auth core (state machine, guards, error
 * mapping, controller) — no React Native rendering, so a plain node
 * environment is enough and tests stay fast and unbrittle.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
