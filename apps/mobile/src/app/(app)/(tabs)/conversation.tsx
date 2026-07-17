import { COMPANION_MAX_MESSAGE_LENGTH } from "@saelis/shared";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import { GlassSurface } from "@/components/glass-surface";
import { SaelisButton } from "@/components/saelis-button";
import { SaelisText } from "@/components/saelis-text";
import { Screen } from "@/components/screen";
import { colors, glass, manropeFamilies, radii, spacing } from "@/theme";

/**
 * Placeholder conversation screen. Live streaming chat against
 * /api/companion/stream arrives in a later sprint; this establishes the
 * keyboard-safe layout, the composer, and the conversation surface.
 */
export default function ConversationScreen() {
  const [draft, setDraft] = useState("");

  return (
    <Screen edges={{ bottom: false }}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
      >
        <View style={styles.header}>
          <SaelisText variant="title">Conversation</SaelisText>
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.messages}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <GlassSurface style={styles.welcome}>
            <SaelisText variant="conversation">
              This is where your conversations with Saelis will live. Live chat isn’t connected in
              this build yet — it arrives in an upcoming update.
            </SaelisText>
          </GlassSurface>
        </ScrollView>

        <GlassSurface tone="strong" padded={false} style={styles.composer}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Say anything…"
            placeholderTextColor={colors.text.muted}
            multiline
            maxLength={COMPANION_MAX_MESSAGE_LENGTH}
            accessibilityLabel="Message"
            style={styles.input}
          />
          <View style={styles.sendRow}>
            <SaelisText variant="meta" color="muted">
              Sending is enabled once live chat is connected.
            </SaelisText>
            <SaelisButton label="Send" disabled />
          </View>
        </GlassSurface>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  header: {
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  messages: {
    gap: spacing.lg,
    paddingBottom: spacing.xl,
  },
  welcome: {
    gap: spacing.sm,
  },
  composer: {
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  input: {
    minHeight: 44,
    maxHeight: 120,
    borderRadius: radii.field,
    borderWidth: 1,
    borderColor: colors.sky.lilac,
    backgroundColor: glass.highlight,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    fontFamily: manropeFamilies["400"],
    fontSize: 17,
    color: colors.text.primary,
  },
  sendRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
});
