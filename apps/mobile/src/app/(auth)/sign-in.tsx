import { Link, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";

import { GlassSurface } from "@/components/glass-surface";
import { InlineNotice } from "@/components/inline-notice";
import { SaelisButton } from "@/components/saelis-button";
import { SaelisText } from "@/components/saelis-text";
import { SaelisTextField } from "@/components/saelis-text-field";
import { Screen } from "@/components/screen";
import { validateSignIn } from "@/lib/auth/validate";
import { useSession } from "@/lib/session";
import { spacing } from "@/theme";

export default function SignInScreen() {
  const { signIn, configError } = useSession();
  // Calm notice from the auth-callback route (e.g. an expired email link).
  const { notice } = useLocalSearchParams<{ notice?: string }>();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit() {
    const validationError = validateSignIn(email, password);
    if (validationError) {
      setError(validationError);
      return;
    }
    setPending(true);
    setError(null);
    const result = await signIn(email, password);
    if (!result.ok) {
      setError(result.error);
      setPending(false);
      return;
    }
    // Success: the auth layout redirects into the app on the state change.
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
            <SaelisText variant="display">Saelis</SaelisText>
            <SaelisText variant="body" color="secondary" style={styles.tagline}>
              Return when you’re ready. Sign in to your quiet place.
            </SaelisText>
          </View>

          <GlassSurface style={styles.card}>
            {configError ? <InlineNotice tone="error">{configError}</InlineNotice> : null}
            {typeof notice === "string" && notice.length > 0 && !error ? (
              <InlineNotice tone="error">{notice}</InlineNotice>
            ) : null}
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
              autoComplete="current-password"
              returnKeyType="done"
              onSubmitEditing={() => void handleSubmit()}
              editable={!pending}
            />
            <SaelisButton
              label={pending ? "Signing in…" : "Sign in"}
              onPress={() => void handleSubmit()}
              disabled={pending || !email || !password}
            />

            <View style={styles.links}>
              <Link href="/(auth)/forgot-password" disabled={pending}>
                <SaelisText variant="label" color="secondary" style={styles.link}>
                  Forgot your password?
                </SaelisText>
              </Link>
              <Link href="/(auth)/sign-up" disabled={pending}>
                <SaelisText variant="label" color="secondary" style={styles.link}>
                  New here? Create a quiet place of your own.
                </SaelisText>
              </Link>
            </View>
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
    gap: spacing["3xl"],
    paddingVertical: spacing["3xl"],
  },
  header: {
    alignItems: "center",
    gap: spacing.md,
  },
  tagline: {
    textAlign: "center",
    maxWidth: 300,
  },
  card: {
    gap: spacing.lg,
  },
  links: {
    gap: spacing.md,
    alignItems: "center",
  },
  link: {
    textDecorationLine: "underline",
  },
});
