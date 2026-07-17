import { StyleSheet, View } from "react-native";
import type { ViewProps } from "react-native";

import { glass, radii, shadows, spacing } from "@/theme";

interface GlassSurfaceProps extends ViewProps {
  /** "strong" is used for chrome that sits over busy sky (tab bar, inputs). */
  tone?: "default" | "strong";
  padded?: boolean;
}

/**
 * Native interpretation of the pearl-glass surface: translucent white fill,
 * hairline lilac-warmed border, soft ink shadow. (No backdrop blur — kept
 * lightweight and consistent across iOS and Android.)
 */
export function GlassSurface({
  tone = "default",
  padded = true,
  style,
  ...rest
}: GlassSurfaceProps) {
  return (
    <View
      {...rest}
      style={[styles.base, tone === "strong" && styles.strong, padded && styles.padded, style]}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: glass.surface,
    borderColor: glass.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.surface,
    ...shadows.surface,
  },
  strong: {
    backgroundColor: glass.surfaceStrong,
  },
  padded: {
    padding: spacing.xl,
  },
});
