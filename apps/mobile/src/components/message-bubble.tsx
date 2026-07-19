import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { Pressable, StyleSheet, View } from "react-native";

import { SaelisText } from "@/components/saelis-text";
import type { ChatMessage } from "@/lib/conversation/store";
import { colors, glass, radii, shadows, spacing } from "@/theme";

interface MessageBubbleProps {
  message: ChatMessage;
  onRetry?: () => void;
}

/**
 * One conversation turn. User messages sit right on a stronger pearl
 * surface; Saelis messages sit left on soft glass with the conversation
 * type size. Long-press copies the text (with a light haptic). Failed and
 * cancelled turns are visibly distinct and offer retry.
 */
export function MessageBubble({ message, onRetry }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const incomplete = message.status === "failed" || message.status === "cancelled";

  async function copy() {
    await Clipboard.setStringAsync(message.content);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  }

  const speaker = isUser ? "You" : "Saelis";
  const suffix =
    message.status === "failed"
      ? isUser
        ? " (not sent)"
        : " (incomplete)"
      : message.status === "cancelled"
        ? isUser
          ? " (stopped)"
          : " (stopped early)"
        : message.status === "streaming"
          ? " (writing)"
          : "";

  return (
    <View style={[styles.row, isUser ? styles.rowUser : styles.rowAssistant]}>
      <Pressable
        onLongPress={() => void copy()}
        delayLongPress={350}
        accessibilityRole="text"
        accessibilityLabel={`${speaker} said${suffix}: ${message.content}`}
        accessibilityHint="Long press to copy"
        style={[
          styles.bubble,
          isUser ? styles.bubbleUser : styles.bubbleAssistant,
          incomplete && styles.bubbleIncomplete,
        ]}
      >
        <SaelisText variant={isUser ? "body" : "conversation"}>{message.content}</SaelisText>
        {incomplete ? (
          <View style={styles.footer}>
            <SaelisText variant="meta" color="muted">
              {message.status === "failed"
                ? isUser
                  ? "Not sent"
                  : "Incomplete — not saved"
                : "Stopped — not saved"}
            </SaelisText>
            {onRetry ? (
              <Pressable
                onPress={onRetry}
                accessibilityRole="button"
                accessibilityLabel="Try again"
                hitSlop={8}
              >
                <SaelisText variant="meta" style={styles.retry}>
                  Try again
                </SaelisText>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
  },
  rowUser: {
    justifyContent: "flex-end",
  },
  rowAssistant: {
    justifyContent: "flex-start",
  },
  bubble: {
    maxWidth: "86%",
    borderRadius: radii.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    ...shadows.surface,
  },
  bubbleUser: {
    backgroundColor: colors.sky.lilac,
    borderColor: colors.accent.lilac,
    borderBottomRightRadius: radii.small,
  },
  bubbleAssistant: {
    backgroundColor: glass.surface,
    borderColor: glass.border,
    borderBottomLeftRadius: radii.small,
  },
  bubbleIncomplete: {
    opacity: 0.75,
    borderStyle: "dashed",
    borderWidth: 1,
    borderColor: colors.accent.blush,
  },
  footer: {
    marginTop: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  retry: {
    color: colors.text.primary,
    textDecorationLine: "underline",
  },
});
