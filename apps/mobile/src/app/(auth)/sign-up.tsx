import { Link } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";

import { GlassSurface } from "@/components/glass-surface";
import { InlineNotice } from "@/components/inline-notice";
import { SaelisButton } from "@/components/saelis-button";
import { SaelisText } from "@/components/saelis-text";
import { SaelisTextField } from "@/components/saelis-text-field";
import { Screen } from "@/components/screen";
import { validateSignUp } from "@/lib/auth/validate";
import { useSession } from "@/lib/session";
import { spacing } from "@/theme";

export default function SignUpScreen() {
  const { signUp } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSubmit() {
    const validationError = validateSignUp(email, password, confirm);
    if (validationError) {
      setError(validationError);
      return;
    }
    setPending(true);
    setError(null);
    const result = await signUp(email, password);
    if (!result.ok) {
      setError(result.error);
      setPending(false);
      return;
    }
    if ("awaitingConfirmation" in result && result.awaitingConfirmation) {
      setAwaitingConfirmation(true);
      setPending(false);
    }
    // Otherwise a session exists and the auth layout redirects into the app.
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
            <SaelisText variant="title">Create a quiet place of your own.</SaelisText>
          </View>

          <GlassSurface style={styles.card}>
            {awaitingConfirmation ? (
              <>
                <InlineNotice tone="success">
                  Almost there — we’ve sent a confirmation link to {email.trim()}. Open it on this
                  device to finish signing up.
                </InlineNotice>
                <Link href="/(auth)/sign-in">
                  <SaelisText variant="label" color="secondary" style={styles.link}>
                    Back to sign in
                  </SaelisText>
                </Link>
              </>
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
                  returnKeyType="next"
                  editable={!pending}
                />
                <SaelisTextField
                  label="Password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoComplete="new-password"
                  returnKeyType="next"
                  editable={!pending}
                />
                <SaelisTextField
                  label="Confirm password"
                  value={confirm}
                  onChangeText={setConfirm}
                  secureTextEntry
                  autoComplete="new-password"
                  returnKeyType="done"
                  onSubmitEditing={() => void handleSubmit()}
                  editable={!pending}
                />
                <SaelisButton
                  label={pending ? "Creating your space…" : "Create account"}
                  onPress={() => void handleSubmit()}
                  disabled={pending || !email || !password || !confirm}
                />
                <Link href="/(auth)/sign-in" disabled={pending}>
                  <SaelisText variant="label" color="secondary" style={styles.link}>
                    Already have an account? Sign in.
                  </SaelisText>
                </Link>
              </>
            )}
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
  link: {
    textDecorationLine: "underline",
  },
});
