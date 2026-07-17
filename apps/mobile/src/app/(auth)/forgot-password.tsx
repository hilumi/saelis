import { Link } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";

import { GlassSurface } from "@/components/glass-surface";
import { InlineNotice } from "@/components/inline-notice";
import { SaelisButton } from "@/components/saelis-button";
import { SaelisText } from "@/components/saelis-text";
import { SaelisTextField } from "@/components/saelis-text-field";
import { Screen } from "@/components/screen";
import { isValidEmail } from "@/lib/auth/validate";
import { useSession } from "@/lib/session";
import { spacing } from "@/theme";

export default function ForgotPasswordScreen() {
  const { requestPasswordReset } = useSession();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit() {
    if (!isValidEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    setPending(true);
    setError(null);
    const result = await requestPasswordReset(email);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    // Always the same message — never reveal whether an email exists.
    setSent(true);
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
            <SaelisText variant="title">We’ll help you find your way back.</SaelisText>
            <SaelisText variant="body" color="secondary">
              Enter your email and we’ll send a link to reset your password. Open the link on this
              device.
            </SaelisText>
          </View>

          <GlassSurface style={styles.card}>
            {sent ? (
              <InlineNotice tone="success">
                If an account exists for {email.trim()}, a reset link is on its way.
              </InlineNotice>
            ) : (
              <>
                {error ? <InlineNotice tone="error">{error}</InlineNotice> : null}
                <SaelisTextField
                  label="Email"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  returnKeyType="done"
                  onSubmitEditing={() => void handleSubmit()}
                  editable={!pending}
                />
                <SaelisButton
                  label={pending ? "Sending…" : "Send reset link"}
                  onPress={() => void handleSubmit()}
                  disabled={pending || !email}
                />
              </>
            )}
            <Link href="/(auth)/sign-in" disabled={pending}>
              <SaelisText variant="label" color="secondary" style={styles.link}>
                Back to sign in
              </SaelisText>
            </Link>
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
    alignItems: "stretch",
  },
  link: {
    textDecorationLine: "underline",
  },
});
