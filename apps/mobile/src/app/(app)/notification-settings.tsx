import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";

import { GlassSurface } from "@/components/glass-surface";
import { InlineNotice } from "@/components/inline-notice";
import { SaelisButton } from "@/components/saelis-button";
import { SaelisText } from "@/components/saelis-text";
import { Screen } from "@/components/screen";
import { ChipGroup, SwitchRow } from "@/components/settings-rows";
import { trackEvent } from "@/lib/analytics";
import {
  deviceTimezone,
  fetchNotificationPreferences,
  saveNotificationPreferences,
  sendTestNotification,
} from "@/lib/notifications/preferences-api";
import type { NotificationPreferences } from "@/lib/notifications/preferences-api";
import { enablePushForThisDevice, disablePushForThisDevice } from "@/lib/notifications/push";
import { colors, spacing } from "@/theme";

/**
 * Notification settings. The OS permission prompt is NEVER shown
 * automatically — only after the explicit "Turn on notifications" action,
 * following the in-app explanation below.
 */
export default function NotificationSettingsScreen() {
  const router = useRouter();
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const loaded = await fetchNotificationPreferences();
        if (mounted) setPrefs(loaded);
      } catch {
        if (mounted) setError("Could not load your notification preferences. Pull back and retry.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const persist = useCallback(async (next: NotificationPreferences) => {
    setPrefs(next);
    setError(null);
    try {
      await saveNotificationPreferences(next);
    } catch {
      setError("That change didn't save. Please try again.");
    }
  }, []);

  async function handleEnable() {
    if (!prefs) return;
    setPending(true);
    setError(null);
    setNotice(null);
    trackEvent("notification_permission_prompted");

    const result = await enablePushForThisDevice();
    switch (result.status) {
      case "registered":
        await persist({ ...prefs, enabled: true, timezone: deviceTimezone() });
        setNotice("Notifications are on. Saelis will keep them rare and gentle.");
        break;
      case "denied":
        trackEvent("notification_permission_denied");
        setError(
          "Notifications are turned off for Saelis in your phone's Settings. You can enable them there any time.",
        );
        break;
      case "dismissed":
        setNotice("No problem — you can turn notifications on any time.");
        break;
      case "unsupported":
        setError(
          result.reason === "simulator"
            ? "Push notifications need a physical device."
            : "Notifications aren't configured for this build yet (missing EAS project id).",
        );
        break;
      case "token_failed":
      case "register_failed":
        setError("Could not set up notifications just now. Please try again.");
        break;
    }
    setPending(false);
  }

  async function handleDisable() {
    if (!prefs) return;
    setPending(true);
    await disablePushForThisDevice();
    await persist({ ...prefs, enabled: false });
    setNotice("Notifications are off.");
    setPending(false);
  }

  async function handleTest() {
    setPending(true);
    setError(null);
    try {
      const delivered = await sendTestNotification();
      setNotice(
        delivered > 0
          ? "Test sent — it should arrive in a moment."
          : "No registered device yet. Turn notifications on first.",
      );
    } catch {
      setError("Could not send a test just now.");
    }
    setPending(false);
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={8}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text.secondary} />
        </Pressable>
        <SaelisText variant="title">Notifications</SaelisText>
      </View>

      {loading ? (
        <View style={styles.loading} accessibilityLabel="Loading preferences">
          <ActivityIndicator color={colors.accent.lilac} size="large" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {error ? <InlineNotice tone="error">{error}</InlineNotice> : null}
          {notice && !error ? <InlineNotice tone="success">{notice}</InlineNotice> : null}

          <GlassSurface style={styles.card}>
            <SaelisText variant="section">Optional, and always yours to change.</SaelisText>
            <SaelisText variant="body" color="secondary">
              Saelis may send a gentle daily check-in, a wellness reminder you asked for, or an
              evening reflection — at most one a day, never during your quiet hours, and never with
              pressure.
            </SaelisText>
            <SaelisText variant="body" color="secondary">
              Private details never appear on your lock screen unless you choose detailed previews.
              You can change or turn all of this off here at any time.
            </SaelisText>
            {prefs && !prefs.enabled ? (
              <SaelisButton
                label={pending ? "One moment…" : "Turn on notifications"}
                onPress={() => void handleEnable()}
                disabled={pending}
              />
            ) : null}
          </GlassSurface>

          {prefs?.enabled ? (
            <>
              <GlassSurface style={styles.card}>
                <SaelisText variant="section">What Saelis may send</SaelisText>
                <SwitchRow
                  label="Gentle check-ins"
                  description="A quiet hello, at your preferred time."
                  value={prefs.gentleCheckIns}
                  onValueChange={(value) => void persist({ ...prefs, gentleCheckIns: value })}
                  disabled={pending}
                />
                <SwitchRow
                  label="Wellness reminders"
                  description="Only about plans you made."
                  value={prefs.wellnessReminders}
                  onValueChange={(value) => void persist({ ...prefs, wellnessReminders: value })}
                  disabled={pending}
                />
                <SwitchRow
                  label="Evening reflections"
                  description="A moment to close the day."
                  value={prefs.eveningReflections}
                  onValueChange={(value) => void persist({ ...prefs, eveningReflections: value })}
                  disabled={pending}
                />
                <SwitchRow
                  label="Your reminders"
                  description="Reminders you create yourself."
                  value={prefs.userReminders}
                  onValueChange={(value) => void persist({ ...prefs, userReminders: value })}
                  disabled={pending}
                />
              </GlassSurface>

              <GlassSurface style={styles.card}>
                <SaelisText variant="section">When</SaelisText>
                <ChipGroup
                  label="Preferred time"
                  options={[
                    { value: "540", label: "Morning · 9:00" },
                    { value: "750", label: "Midday · 12:30" },
                    { value: "1140", label: "Evening · 19:00" },
                  ]}
                  selected={String(prefs.preferredTimeMinutes) as "540" | "750" | "1140"}
                  onSelect={(value) =>
                    void persist({ ...prefs, preferredTimeMinutes: Number(value) })
                  }
                  disabled={pending}
                />
                <ChipGroup
                  label="Quiet hours"
                  options={[
                    { value: "1260-480", label: "21:00 – 8:00" },
                    { value: "1320-420", label: "22:00 – 7:00" },
                    { value: "0-0", label: "Off" },
                  ]}
                  selected={
                    `${prefs.quietHoursStartMinutes}-${prefs.quietHoursEndMinutes}` as
                      "1260-480" | "1320-420" | "0-0"
                  }
                  onSelect={(value) => {
                    const [start, end] = value.split("-").map(Number);
                    void persist({
                      ...prefs,
                      quietHoursStartMinutes: start ?? 1260,
                      quietHoursEndMinutes: end ?? 480,
                    });
                  }}
                  disabled={pending}
                />
                <ChipGroup
                  label="How often Saelis may reach out"
                  options={[
                    { value: "daily", label: "Daily" },
                    { value: "few_per_week", label: "A few times a week" },
                    { value: "weekly", label: "Weekly" },
                  ]}
                  selected={prefs.proactiveFrequency}
                  onSelect={(value) => void persist({ ...prefs, proactiveFrequency: value })}
                  disabled={pending}
                />
                <SaelisText variant="meta" color="muted">
                  Timezone: {prefs.timezone}. During beta, Saelis sends at most one check-in per
                  day.
                </SaelisText>
              </GlassSurface>

              <GlassSurface style={styles.card}>
                <SaelisText variant="section">Privacy</SaelisText>
                <SwitchRow
                  label="Detailed previews"
                  description='Off: your lock screen only shows "Saelis has a gentle reminder for you."'
                  value={prefs.previewMode === "detailed"}
                  onValueChange={(value) =>
                    void persist({ ...prefs, previewMode: value ? "detailed" : "private" })
                  }
                  disabled={pending}
                />
              </GlassSurface>

              <SaelisButton
                label="Send a test notification"
                tone="quiet"
                onPress={() => void handleTest()}
                disabled={pending}
              />
              <SaelisButton
                label="Turn off on this device"
                tone="quiet"
                onPress={() => void handleDisable()}
                disabled={pending}
              />
            </>
          ) : null}
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  backButton: {
    minWidth: 32,
    minHeight: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    gap: spacing.xl,
    paddingBottom: spacing["3xl"],
  },
  card: {
    gap: spacing.lg,
  },
});
