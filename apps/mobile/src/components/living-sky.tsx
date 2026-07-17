import { useEffect, useState } from "react";
import { Animated, Easing, StyleSheet, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { useReducedMotion } from "@/lib/use-reduced-motion";
import { colors, livingSkyGradient } from "@/theme";

/**
 * The Living Sky — a lightweight native interpretation of the web celestial
 * environment: the day gradient with a few soft cloud forms drifting very
 * slowly. Decorative only (never intercepts touches), transform/opacity
 * animation only, and completely still when the system requests reduced
 * motion.
 */
export function LivingSky() {
  const { width, height } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  // Stable animated value without reading a ref during render.
  const [drift] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (reducedMotion) {
      drift.stopAnimation();
      drift.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, {
          toValue: 1,
          duration: 90_000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(drift, {
          toValue: 0,
          duration: 90_000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [drift, reducedMotion]);

  const driftNear = drift.interpolate({ inputRange: [0, 1], outputRange: [0, width * 0.06] });
  const driftFar = drift.interpolate({ inputRange: [0, 1], outputRange: [0, -width * 0.04] });

  return (
    <LinearGradient
      colors={[...livingSkyGradient]}
      locations={[0, 0.34, 0.66, 1]}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Animated.View
        style={[
          styles.cloud,
          {
            top: height * 0.08,
            left: -width * 0.2,
            width: width * 0.9,
            height: height * 0.16,
            backgroundColor: colors.cloud.blue,
            transform: [{ translateX: driftNear }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.cloud,
          {
            top: height * 0.38,
            right: -width * 0.25,
            width: width * 0.95,
            height: height * 0.18,
            backgroundColor: colors.cloud.lilac,
            transform: [{ translateX: driftFar }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.cloud,
          {
            bottom: height * 0.1,
            left: -width * 0.12,
            width: width,
            height: height * 0.16,
            backgroundColor: colors.cloud.pink,
            transform: [{ translateX: driftNear }],
          },
        ]}
      />
      {/* Horizon glow */}
      <LinearGradient
        colors={["transparent", "rgba(216, 193, 143, 0.28)"]}
        style={styles.horizon}
        pointerEvents="none"
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  cloud: {
    position: "absolute",
    borderRadius: 999,
    opacity: 0.45,
  },
  horizon: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "22%",
  },
});
