import { StyleSheet, View } from "react-native";
import type { ReactNode } from "react";

import { SaelisText } from "@/components/saelis-text";
import { colors, radii, spacing } from "@/theme";

interface InlineNoticeProps {
  tone: "error" | "success";
  children: ReactNode;
}

/**
 * Calm inline notice, mirroring the web InlineNotice: soft tinted surface,
 * never alarming reds. Announced politely to screen readers.
 */
export function InlineNotice({ tone, children }: InlineNoticeProps) {
  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[styles.base, tone === "error" ? styles.error : styles.success]}
    >
      <SaelisText variant="label" color="primary">
        {children}
      </SaelisText>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.field,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  error: {
    backgroundColor: colors.cloud.pink,
    borderColor: colors.accent.blush,
  },
  success: {
    backgroundColor: colors.cloud.mint,
    borderColor: colors.quietMint,
  },
});
