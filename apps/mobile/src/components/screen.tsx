import { StyleSheet, View } from "react-native";
import type { ReactNode } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LivingSky } from "@/components/living-sky";
import { spacing } from "@/theme";

interface ScreenProps {
  children: ReactNode;
  /** Tab screens let the tab bar own the bottom inset. */
  edges?: { bottom?: boolean };
}

/**
 * Screen shell: Living Sky behind everything, content padded inside the safe
 * area (notches, home indicator) with the shared horizontal rhythm.
 */
export function Screen({ children, edges }: ScreenProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.root}>
      <LivingSky />
      <View
        style={[
          styles.content,
          {
            paddingTop: insets.top + spacing.lg,
            paddingLeft: insets.left + spacing.xl,
            paddingRight: insets.right + spacing.xl,
            paddingBottom: (edges?.bottom === false ? 0 : insets.bottom) + spacing.lg,
          },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});
