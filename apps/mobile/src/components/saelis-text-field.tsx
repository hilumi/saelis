import { StyleSheet, TextInput, View } from "react-native";
import type { TextInputProps } from "react-native";

import { SaelisText } from "@/components/saelis-text";
import { colors, glass, manropeFamilies, radii, spacing } from "@/theme";

interface SaelisTextFieldProps extends TextInputProps {
  label: string;
}

/** Labeled input in the shared field geometry (radius `field`, pearl fill). */
export function SaelisTextField({ label, style, ...rest }: SaelisTextFieldProps) {
  return (
    <View style={styles.group}>
      <SaelisText variant="label" color="secondary">
        {label}
      </SaelisText>
      <TextInput
        placeholderTextColor={colors.text.muted}
        accessibilityLabel={label}
        {...rest}
        style={[styles.input, style]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: spacing.xs,
  },
  input: {
    minHeight: 48,
    borderRadius: radii.field,
    borderWidth: 1,
    borderColor: colors.sky.lilac,
    backgroundColor: glass.surfaceStrong,
    paddingHorizontal: spacing.lg,
    fontFamily: manropeFamilies["400"],
    fontSize: 16,
    color: colors.text.primary,
  },
});
