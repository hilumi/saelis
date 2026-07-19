import { useRouter } from "expo-router";
import { useEffect } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { hasSeenOnboarding } from "@/lib/onboarding";

import { GlassSurface } from "@/components/glass-surface";
import { SaelisButton } from "@/components/saelis-button";
import { SaelisText } from "@/components/saelis-text";
import { Screen } from "@/components/screen";
import { spacing } from "@/theme";

function greetingForHour(hour: number): string {
  if (hour < 5) return "A quiet hour";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";
  return "A quiet hour";
}

/** Native home screen: a calm arrival, not a dashboard. */
export default function HomeScreen() {
  const router = useRouter();
  const greeting = greetingForHour(new Date().getHours());

  // First launch: show the brief, skippable introduction once.
  useEffect(() => {
    let mounted = true;
    void hasSeenOnboarding().then((seen) => {
      if (mounted && !seen) router.push("/(app)/onboarding");
    });
    return () => {
      mounted = false;
    };
  }, [router]);

  return (
    <Screen edges={{ bottom: false }}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <SaelisText variant="display">{greeting}</SaelisText>
          <SaelisText variant="body" color="secondary">
            Whenever you’re ready. There’s no rush here.
          </SaelisText>
        </View>

        <GlassSurface style={styles.card}>
          <SaelisText variant="section">Start a conversation</SaelisText>
          <SaelisText variant="body" color="secondary">
            Say anything — even a single word is a fine place to start.
          </SaelisText>
          <SaelisButton
            label="Open conversation"
            onPress={() => router.push("/(app)/(tabs)/conversation")}
          />
        </GlassSurface>

        <GlassSurface style={styles.card}>
          <SaelisText variant="section">Your space</SaelisText>
          <SaelisText variant="body" color="secondary">
            Saelis remembers what matters to you and meets you where you are. More of your space
            arrives in the next update.
          </SaelisText>
        </GlassSurface>
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
    gap: spacing.sm,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  card: {
    gap: spacing.md,
  },
});
