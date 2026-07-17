import Constants from "expo-constants";
import { ScrollView, StyleSheet, View } from "react-native";

import { GlassSurface } from "@/components/glass-surface";
import { SaelisButton } from "@/components/saelis-button";
import { SaelisText } from "@/components/saelis-text";
import { Screen } from "@/components/screen";
import { useSession } from "@/lib/session";
import { spacing } from "@/theme";

/** Settings: placeholders for account and preferences, plus sign out. */
export default function SettingsScreen() {
  const { signOut, session } = useSession();
  const version = Constants.expoConfig?.version ?? "0.1.0";

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

        <GlassSurface style={styles.card}>
          <SaelisText variant="section">Companion preferences</SaelisText>
          <SaelisText variant="body" color="secondary">
            Tone, response length, and other preferences will be editable here — the same
            preferences you set on the web.
          </SaelisText>
        </GlassSurface>

        <GlassSurface style={styles.card}>
          <SaelisText variant="section">About</SaelisText>
          <SaelisText variant="body" color="secondary">
            Saelis {version}. Saelis is a companion for reflection and planning — it isn’t a
            clinician and doesn’t provide medical care.
          </SaelisText>
        </GlassSurface>

        <SaelisButton label="Sign out" tone="quiet" onPress={signOut} />
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
});
