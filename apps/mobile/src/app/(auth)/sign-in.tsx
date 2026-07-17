import { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from "react-native";

import { GlassSurface } from "@/components/glass-surface";
import { SaelisButton } from "@/components/saelis-button";
import { SaelisText } from "@/components/saelis-text";
import { Screen } from "@/components/screen";
import { useSession } from "@/lib/session";
import { colors, glass, manropeFamilies, radii, spacing } from "@/theme";

/**
 * Placeholder authentication screen. Sprint 2 wires this to Supabase auth;
 * for now any email "continues" into a local placeholder session so the
 * protected route group can be exercised.
 */
export default function SignInScreen() {
  const { signIn } = useSession();
  const [email, setEmail] = useState("");

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.center}>
          <View style={styles.header}>
            <SaelisText variant="display">Saelis</SaelisText>
            <SaelisText variant="body" color="secondary" style={styles.tagline}>
              A quiet place to feel understood, think clearly, and find what comes next.
            </SaelisText>
          </View>

          <GlassSurface style={styles.card}>
            <SaelisText variant="section">Welcome</SaelisText>
            <SaelisText variant="label" color="secondary">
              Email
            </SaelisText>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={colors.text.muted}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              returnKeyType="done"
              onSubmitEditing={signIn}
              accessibilityLabel="Email address"
              style={styles.input}
            />
            <SaelisButton label="Continue" onPress={signIn} />
            <SaelisText variant="meta" color="muted" style={styles.note}>
              Sign-in is a placeholder in this build. Nothing is sent anywhere yet.
            </SaelisText>
          </GlassSurface>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    gap: spacing["3xl"],
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
    gap: spacing.md,
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
  note: {
    textAlign: "center",
  },
});
