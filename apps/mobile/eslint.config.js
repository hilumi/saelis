// ESLint flat config for the Saelis mobile app (used by `expo lint`).
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["node_modules/**", ".expo/**", "expo-env.d.ts", "ios/**", "android/**"],
  },
]);
