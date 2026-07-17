import { Pressable, StyleSheet } from "react-native";
import type { PressableProps } from "react-native";

import { SaelisText } from "@/components/saelis-text";
import { colors, minTouchTarget, radii, shadows, spacing } from "@/theme";

interface SaelisButtonProps extends Omit<PressableProps, "children"> {
  label: string;
  tone?: "primary" | "quiet";
}

/**
 * Pill button (radius `control`). Primary uses accent lilac with primary ink
 * — contrast stays comfortable; quiet is a translucent pearl surface.
 */
export function SaelisButton({ label, tone = "primary", disabled, ...rest }: SaelisButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled === true }}
      disabled={disabled}
      {...rest}
      style={({ pressed }) => [
        styles.base,
        tone === "primary" ? styles.primary : styles.quiet,
        pressed && styles.pressed,
        disabled === true && styles.disabled,
      ]}
    >
      <SaelisText variant="label" color="primary" style={styles.label}>
        {label}
      </SaelisText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: minTouchTarget,
    borderRadius: radii.control,
    paddingHorizontal: spacing["2xl"],
    paddingVertical: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.chrome,
  },
  primary: {
    backgroundColor: colors.sky.lilac,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.accent.lilac,
  },
  quiet: {
    backgroundColor: "rgba(255, 255, 255, 0.78)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.sky.lilac,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    textAlign: "center",
  },
});
