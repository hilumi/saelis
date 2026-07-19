import { useEffect, useState } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";

import { SaelisText } from "@/components/saelis-text";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { glass, motion, radii, spacing } from "@/theme";

/**
 * "Saelis is thinking" state: a quiet pulse on soft glass. With reduced
 * motion the pulse is skipped entirely — the text alone carries the state.
 */
export function ThinkingIndicator() {
  const reducedMotion = useReducedMotion();
  const [opacity] = useState(() => new Animated.Value(1));

  useEffect(() => {
    if (reducedMotion) {
      opacity.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.45,
          duration: motion.durations.slow * 2,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: motion.durations.slow * 2,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity, reducedMotion]);

  return (
    <View style={styles.row} accessibilityLiveRegion="polite">
      <Animated.View style={[styles.bubble, { opacity }]}>
        <SaelisText variant="label" color="secondary" accessibilityLabel="Saelis is thinking">
          Saelis is thinking…
        </SaelisText>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "flex-start",
  },
  bubble: {
    backgroundColor: glass.surface,
    borderColor: glass.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.surface,
    borderBottomLeftRadius: radii.small,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
});
