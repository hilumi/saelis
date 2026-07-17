import { ActivityIndicator, StyleSheet, View } from "react-native";

import { LivingSky } from "@/components/living-sky";
import { colors, spacing } from "@/theme";

/**
 * Launch / loading state shown while fonts load and the session is restored.
 * Quiet by design: the sky, a soft spinner, nothing to read.
 */
export function LaunchScreen() {
  return (
    <View style={styles.root} accessibilityLabel="Saelis is starting">
      <LivingSky />
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent.lilac} size="large" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.lg,
  },
});
