/**
 * Native theme for Saelis mobile, derived from @saelis/design-tokens.
 * Do not hard-code colors or sizes in screens — read them from here.
 */
import {
  colors,
  fontWeights,
  glass,
  livingSkyGradient,
  motion,
  radii,
  shadows,
  spacing,
  typography,
} from "@saelis/design-tokens";

export { colors, glass, livingSkyGradient, motion, radii, shadows, spacing, typography };

/**
 * Manrope ships as one static file per weight, so React Native selects
 * weights by font *family* name rather than `fontWeight`.
 */
export const manropeFamilies: Record<(typeof fontWeights)[keyof typeof fontWeights], string> = {
  "400": "Manrope_400Regular",
  "500": "Manrope_500Medium",
  "600": "Manrope_600SemiBold",
  "700": "Manrope_700Bold",
};

export type TypographyVariant = keyof typeof typography;

/** Minimum touch target for accessible controls (Apple HIG / Material). */
export const minTouchTarget = 44;
