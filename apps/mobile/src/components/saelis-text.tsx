import { Text } from "react-native";
import type { TextProps, TextStyle } from "react-native";

import { colors, manropeFamilies, typography } from "@/theme";
import type { TypographyVariant } from "@/theme";

interface SaelisTextProps extends TextProps {
  variant?: TypographyVariant;
  color?: "primary" | "secondary" | "muted";
}

const TEXT_COLORS = {
  primary: colors.text.primary,
  secondary: colors.text.secondary,
  muted: colors.text.muted,
} as const;

/**
 * The one text component. Renders the Manrope hierarchy from the design
 * tokens; screens never set font families or sizes directly.
 */
export function SaelisText({
  variant = "body",
  color = "primary",
  style,
  ...rest
}: SaelisTextProps) {
  const spec = typography[variant];
  const textStyle: TextStyle = {
    fontFamily: manropeFamilies[spec.fontWeight],
    fontSize: spec.fontSize,
    lineHeight: spec.lineHeight,
    letterSpacing: spec.letterSpacing,
    color: TEXT_COLORS[color],
  };
  // `allowFontScaling` stays on (default): Dynamic Type is respected.
  return <Text {...rest} style={[textStyle, style]} />;
}
