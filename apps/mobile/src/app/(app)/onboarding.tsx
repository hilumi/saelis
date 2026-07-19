import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";

import { GlassSurface } from "@/components/glass-surface";
import { SaelisButton } from "@/components/saelis-button";
import { SaelisText } from "@/components/saelis-text";
import { Screen } from "@/components/screen";
import { markOnboardingSeen } from "@/lib/onboarding";
import { spacing } from "@/theme";

const SECTIONS: { title: string; body: string }[] = [
  {
    title: "Talk naturally",
    body: "No commands, no right way to start. Say whatever's on your mind — a word is enough.",
  },
  {
    title: "Advice, or just an ear",
    body: "Tell Saelis what you need: practical help, or space to think out loud. It won't push plans on you.",
  },
  {
    title: "Wellness, gently",
    body: "Create wellness goals and reminders if you want them. They stay optional, always.",
  },
  {
    title: "You control what's remembered",
    body: "Saelis only keeps a memory when you approve it. You can see, delete, or clear everything in Settings.",
  },
  {
    title: "Notifications and privacy",
    body: "Notifications are off until you turn them on — at most one gentle check-in a day, nothing private on your lock screen unless you choose.",
  },
  {
    title: "An AI companion",
    body: "Saelis is an AI — a thoughtful companion, not a therapist, doctor, or emergency service. For urgent help, reach out to 911 or 988 (US).",
  },
];

/** Brief, skippable introduction. Shown once; replayable from Settings. */
export default function OnboardingScreen() {
  const router = useRouter();

  async function finish() {
    await markOnboardingSeen();
    if (router.canGoBack()) router.back();
    else router.replace("/(app)/(tabs)");
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <SaelisText variant="display">Meet Saelis</SaelisText>
          <SaelisText variant="body" color="secondary">
            A quiet place to feel understood. Six things worth knowing:
          </SaelisText>
        </View>

        {SECTIONS.map((section, index) => (
          <GlassSurface key={section.title} style={styles.card}>
            <SaelisText variant="meta" color="muted">
              {index + 1} of {SECTIONS.length}
            </SaelisText>
            <SaelisText variant="section">{section.title}</SaelisText>
            <SaelisText variant="body" color="secondary">
              {section.body}
            </SaelisText>
          </GlassSurface>
        ))}

        <SaelisButton label="Let's begin" onPress={() => void finish()} />
        <SaelisButton label="Skip for now" tone="quiet" onPress={() => void finish()} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    paddingVertical: spacing["2xl"],
  },
  header: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  card: {
    gap: spacing.xs,
  },
});
