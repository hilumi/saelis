import { useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";

import { GlassSurface } from "@/components/glass-surface";
import { InlineNotice } from "@/components/inline-notice";
import { SaelisButton } from "@/components/saelis-button";
import { SaelisText } from "@/components/saelis-text";
import { SaelisTextField } from "@/components/saelis-text-field";
import { Screen } from "@/components/screen";
import { validateNewPassword } from "@/lib/auth/validate";
import { useSession } from "@/lib/session";
import { spacing } from "@/theme";

/**
 * Set a new password after a recovery link. Lives in the protected group:
 * the recovery link signs the user in (PKCE exchange) before arriving here.
 */
export default function ResetPasswordScreen() {
  const router = useRouter();
  const { updatePassword } = useSession();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit() {
    const validationError = validateNewPassword(password, confirm);
    if (validationError) {
      setError(validationError);
      return;
    }
    setPending(true);
    setError(null);
    const result = await updatePassword(password);
    if (!result.ok) {
      setError(result.error);
      setPending(false);
      return;
    }
    router.replace("/(app)/(tabs)");
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <SaelisText variant="title">Choose a new password.</SaelisText>
            <SaelisText variant="body" color="secondary">
              You’re signed in — set a new password to finish finding your way back.
            </SaelisText>
          </View>

          <GlassSurface style={styles.card}>
            {error ? <InlineNotice tone="error">{error}</InlineNotice> : null}
            <SaelisTextField
              label="New password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="new-password"
              returnKeyType="next"
              editable={!pending}
            />
            <SaelisTextField
              label="Confirm new password"
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry
              autoComplete="new-password"
              returnKeyType="done"
              onSubmitEditing={() => void handleSubmit()}
              editable={!pending}
            />
            <SaelisButton
              label={pending ? "Saving…" : "Save new password"}
              onPress={() => void handleSubmit()}
              disabled={pending || !password || !confirm}
            />
            <SaelisButton
              label="Not now"
              tone="quiet"
              onPress={() => router.replace("/(app)/(tabs)")}
              disabled={pending}
            />
          </GlassSurface>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    gap: spacing["2xl"],
    paddingVertical: spacing["3xl"],
  },
  header: {
    gap: spacing.sm,
  },
  card: {
    gap: spacing.lg,
  },
});
