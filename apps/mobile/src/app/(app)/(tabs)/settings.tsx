import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { GlassSurface } from "@/components/glass-surface";
import { SaelisButton } from "@/components/saelis-button";
import { SaelisText } from "@/components/saelis-text";
import { Screen } from "@/components/screen";
import { disablePushForThisDevice } from "@/lib/notifications/push";
import { useSession } from "@/lib/session";
import { colors, minTouchTarget, spacing } from "@/theme";

interface SettingsLinkProps {
  title: string;
  description: string;
  onPress(): void;
}

function SettingsLink({ title, description, onPress }: SettingsLinkProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={description}
      style={({ pressed }) => [styles.link, pressed && styles.linkPressed]}
    >
      <View style={styles.linkText}>
        <SaelisText variant="body">{title}</SaelisText>
        <SaelisText variant="meta" color="muted">
          {description}
        </SaelisText>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.text.muted} />
    </Pressable>
  );
}

/** Settings: account, notifications, memory, onboarding replay, sign out. */
export default function SettingsScreen() {
  const router = useRouter();
  const { signOut, session } = useSession();
  const [signingOut, setSigningOut] = useState(false);
  const version = Constants.expoConfig?.version ?? "0.1.0";

  async function handleSignOut() {
    setSigningOut(true);
    // Remove this device's push token first — a signed-out device must not
    // keep receiving personal notifications.
    await disablePushForThisDevice();
    await signOut();
  }

  return (
    <Screen edges={{ bottom: false }}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <SaelisText variant="title">Settings</SaelisText>
        </View>

        <GlassSurface style={styles.card}>
          <SaelisText variant="section">Account</SaelisText>
          <SaelisText variant="body" color="secondary">
            {session?.email ?? "Signed in"}
          </SaelisText>
          <SaelisText variant="meta" color="muted">
            The same account and data as saelis on the web.
          </SaelisText>
        </GlassSurface>

        <GlassSurface style={styles.card} padded={true}>
          <SaelisText variant="section">Companion</SaelisText>
          <SettingsLink
            title="Notifications"
            description="Optional check-ins, quiet hours, privacy previews."
            onPress={() => router.push("/(app)/notification-settings")}
          />
          <SettingsLink
            title="Memory"
            description="What Saelis may remember — always your choice."
            onPress={() => router.push("/(app)/memory-settings")}
          />
          <SettingsLink
            title="About Saelis"
            description="Replay the short introduction."
            onPress={() => router.push("/(app)/onboarding")}
          />
        </GlassSurface>

        <GlassSurface style={styles.card}>
          <SaelisText variant="section">About</SaelisText>
          <SaelisText variant="body" color="secondary">
            Saelis {version}. Saelis is an AI companion for reflection and planning — it isn’t a
            clinician and doesn’t replace professional or emergency support.
          </SaelisText>
        </GlassSurface>

        <SaelisButton
          label={signingOut ? "Signing out…" : "Sign out"}
          tone="quiet"
          onPress={() => void handleSignOut()}
          disabled={signingOut}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.xl,
    paddingBottom: spacing["3xl"],
  },
  header: {
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  card: {
    gap: spacing.md,
  },
  link: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    minHeight: minTouchTarget,
  },
  linkPressed: {
    opacity: 0.7,
  },
  linkText: {
    flex: 1,
    gap: 2,
  },
});
