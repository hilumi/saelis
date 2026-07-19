import { Pressable, StyleSheet, Switch, View } from "react-native";

import { SaelisText } from "@/components/saelis-text";
import { colors, minTouchTarget, radii, spacing } from "@/theme";

/** Shared settings controls: labeled switch rows and single-select chips. */

interface SwitchRowProps {
  label: string;
  description?: string;
  value: boolean;
  onValueChange(value: boolean): void;
  disabled?: boolean;
}

export function SwitchRow({ label, description, value, onValueChange, disabled }: SwitchRowProps) {
  return (
    <View style={styles.switchRow}>
      <View style={styles.switchText}>
        <SaelisText variant="body">{label}</SaelisText>
        {description ? (
          <SaelisText variant="meta" color="muted">
            {description}
          </SaelisText>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        accessibilityLabel={label}
        accessibilityState={{ checked: value, disabled: disabled === true }}
        trackColor={{ true: colors.accent.lilac, false: colors.sky.lilac }}
        thumbColor={colors.cloud.white}
      />
    </View>
  );
}

export interface ChipOption<T extends string> {
  value: T;
  label: string;
}

interface ChipGroupProps<T extends string> {
  label: string;
  options: ChipOption<T>[];
  selected: T;
  onSelect(value: T): void;
  disabled?: boolean;
}

export function ChipGroup<T extends string>({
  label,
  options,
  selected,
  onSelect,
  disabled,
}: ChipGroupProps<T>) {
  return (
    <View style={styles.chipGroup}>
      <SaelisText variant="label" color="secondary">
        {label}
      </SaelisText>
      <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel={label}>
        {options.map((option) => {
          const isSelected = option.value === selected;
          return (
            <Pressable
              key={option.value}
              onPress={() => onSelect(option.value)}
              disabled={disabled}
              accessibilityRole="radio"
              accessibilityLabel={option.label}
              accessibilityState={{ selected: isSelected, disabled: disabled === true }}
              style={({ pressed }) => [
                styles.chip,
                isSelected && styles.chipSelected,
                pressed && styles.chipPressed,
              ]}
            >
              {/* Selection is conveyed by border + weight, never color alone. */}
              <SaelisText
                variant="label"
                color={isSelected ? "primary" : "secondary"}
                style={isSelected ? styles.chipLabelSelected : undefined}
              >
                {isSelected ? `✓ ${option.label}` : option.label}
              </SaelisText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.lg,
    minHeight: minTouchTarget,
  },
  switchText: {
    flex: 1,
    gap: 2,
  },
  chipGroup: {
    gap: spacing.sm,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  chip: {
    minHeight: 36,
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.sky.lilac,
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    paddingHorizontal: spacing.lg,
    justifyContent: "center",
  },
  chipSelected: {
    borderColor: colors.accent.lilac,
    borderWidth: 2,
    backgroundColor: colors.sky.lilac,
  },
  chipPressed: {
    opacity: 0.85,
  },
  chipLabelSelected: {
    fontFamily: "Manrope_600SemiBold",
  },
});
