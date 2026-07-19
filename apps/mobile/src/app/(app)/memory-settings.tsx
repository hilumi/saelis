import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import { GlassSurface } from "@/components/glass-surface";
import { InlineNotice } from "@/components/inline-notice";
import { SaelisButton } from "@/components/saelis-button";
import { SaelisText } from "@/components/saelis-text";
import { SaelisTextField } from "@/components/saelis-text-field";
import { Screen } from "@/components/screen";
import { SwitchRow } from "@/components/settings-rows";
import { trackEvent } from "@/lib/analytics";
import { useConversation } from "@/lib/conversation/provider";
import {
  addMemory,
  clearAllMemories,
  deleteMemory,
  fetchMemorySettings,
  listMemories,
  setAllowCompanionMemory,
  setPreferredName,
} from "@/lib/memory/api";
import type { CompanionMemoryItem } from "@/lib/memory/api";
import { useSession } from "@/lib/session";
import { colors, minTouchTarget, spacing } from "@/theme";

/**
 * Memory controls. Calm and transparent: conversations aren't automatically
 * remembered; only approved memories appear here, and everything is
 * deletable. Temporary mode stops new memories for the current session.
 */
export default function MemorySettingsScreen() {
  const router = useRouter();
  const { session } = useSession();
  const { state, setTemporaryMode } = useConversation();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [allowMemory, setAllowMemory] = useState(true);
  const [name, setName] = useState("");
  const [newMemory, setNewMemory] = useState("");
  const [memories, setMemories] = useState<CompanionMemoryItem[]>([]);
  const [pending, setPending] = useState(false);

  const reload = useCallback(async () => {
    // Data loads first; every setState below runs after the awaits resolve.
    const loaded = await Promise.all([fetchMemorySettings(), listMemories()]).catch(() => null);
    if (loaded) {
      const [settings, items] = loaded;
      setAllowMemory(settings.allowCompanionMemory);
      setName(settings.preferredName ?? "");
      setMemories(items);
      setError(null);
    } else {
      setError("Could not load your memory settings. Please try again.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    let mounted = true;
    void Promise.resolve().then(() => {
      if (mounted) return reload();
    });
    return () => {
      mounted = false;
    };
  }, [reload]);

  async function handleToggleMemory(value: boolean) {
    if (!session) return;
    setAllowMemory(value);
    try {
      await setAllowCompanionMemory(session.userId, value);
      trackEvent(value ? "memory_enabled" : "memory_disabled");
    } catch {
      setAllowMemory(!value);
      setError("That change didn't save. Please try again.");
    }
  }

  async function handleSaveName() {
    setPending(true);
    try {
      await setPreferredName(name);
      setNotice("Saved.");
      setError(null);
    } catch {
      setError("Could not save your name.");
    }
    setPending(false);
  }

  async function handleAddMemory() {
    if (!session || newMemory.trim().length === 0) return;
    setPending(true);
    try {
      await addMemory(session.userId, newMemory);
      setNewMemory("");
      setNotice("Saelis will remember that.");
      setError(null);
      await reload();
    } catch (addError) {
      setError(addError instanceof Error ? addError.message : "Could not save that memory.");
    }
    setPending(false);
  }

  async function handleDelete(memory: CompanionMemoryItem) {
    try {
      await deleteMemory(memory.id);
      trackEvent("memory_deleted");
      setMemories((current) => current.filter((item) => item.id !== memory.id));
    } catch {
      setError("Could not delete that memory.");
    }
  }

  function confirmClearAll() {
    if (!session || memories.length === 0) return;
    Alert.alert(
      "Clear all memories?",
      "Saelis will forget everything it was asked to remember. This can't be undone.",
      [
        { text: "Keep them", style: "cancel" },
        {
          text: "Clear all",
          style: "destructive",
          onPress: () => {
            void (async () => {
              try {
                await clearAllMemories(session.userId);
                trackEvent("memory_deleted", { cleared_all: true });
                setMemories([]);
                setNotice("All memories cleared.");
              } catch {
                setError("Could not clear your memories.");
              }
            })();
          },
        },
      ],
    );
  }

  function handleTemporaryToggle(value: boolean) {
    setTemporaryMode(value);
    if (value) trackEvent("temporary_mode_enabled");
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
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
          <SaelisText variant="title">Memory</SaelisText>
        </View>

        {loading ? (
          <View style={styles.loading} accessibilityLabel="Loading memory settings">
            <ActivityIndicator color={colors.accent.lilac} size="large" />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {error ? <InlineNotice tone="error">{error}</InlineNotice> : null}
            {notice && !error ? <InlineNotice tone="success">{notice}</InlineNotice> : null}

            <GlassSurface style={styles.card}>
              <SaelisText variant="body" color="secondary">
                Conversations aren’t automatically remembered. Saelis keeps a memory only when you
                ask it to, or approve one it offers — and everything it keeps is listed below, yours
                to delete any time.
              </SaelisText>
              <SwitchRow
                label="Companion memory"
                description="Allow Saelis to keep memories you approve."
                value={allowMemory}
                onValueChange={(value) => void handleToggleMemory(value)}
              />
              <SwitchRow
                label="Temporary conversation"
                description="For this session: nothing new is remembered."
                value={state.temporaryMode}
                onValueChange={handleTemporaryToggle}
              />
            </GlassSurface>

            <GlassSurface style={styles.card}>
              <SaelisText variant="section">What Saelis calls you</SaelisText>
              <SaelisTextField
                label="Preferred name"
                value={name}
                onChangeText={setName}
                placeholder="Optional"
                autoCapitalize="words"
                editable={!pending}
                returnKeyType="done"
                onSubmitEditing={() => void handleSaveName()}
              />
              <SaelisButton
                label="Save name"
                tone="quiet"
                onPress={() => void handleSaveName()}
                disabled={pending}
              />
            </GlassSurface>

            <GlassSurface style={styles.card}>
              <SaelisText variant="section">Ask Saelis to remember something</SaelisText>
              <SaelisTextField
                label="A goal, a preference, important context"
                value={newMemory}
                onChangeText={setNewMemory}
                placeholder="e.g. I'm training for a 5k in October"
                editable={!pending && allowMemory}
                multiline
              />
              <SaelisButton
                label="Remember this"
                onPress={() => void handleAddMemory()}
                disabled={pending || !allowMemory || newMemory.trim().length === 0}
              />
              {!allowMemory ? (
                <SaelisText variant="meta" color="muted">
                  Turn companion memory on to add new memories.
                </SaelisText>
              ) : null}
            </GlassSurface>

            <GlassSurface style={styles.card}>
              <SaelisText variant="section">Saved memories</SaelisText>
              {memories.length === 0 ? (
                <SaelisText variant="body" color="secondary">
                  Nothing saved yet. Saelis only remembers what you approve.
                </SaelisText>
              ) : (
                memories.map((memory) => (
                  <View key={memory.id} style={styles.memoryRow}>
                    <View style={styles.memoryText}>
                      <SaelisText variant="body">{memory.content}</SaelisText>
                      <SaelisText variant="meta" color="muted">
                        {memory.category.replace(/-/g, " ")}
                      </SaelisText>
                    </View>
                    <Pressable
                      onPress={() => void handleDelete(memory)}
                      accessibilityRole="button"
                      accessibilityLabel={`Delete memory: ${memory.content.slice(0, 40)}`}
                      hitSlop={8}
                      style={styles.deleteButton}
                    >
                      <Ionicons name="trash-outline" size={20} color={colors.text.secondary} />
                    </Pressable>
                  </View>
                ))
              )}
              {memories.length > 0 ? (
                <SaelisButton label="Clear all memories" tone="quiet" onPress={confirmClearAll} />
              ) : null}
            </GlassSurface>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
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
  memoryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    minHeight: minTouchTarget,
  },
  memoryText: {
    flex: 1,
    gap: 2,
  },
  deleteButton: {
    minWidth: 32,
    minHeight: 32,
    alignItems: "center",
    justifyContent: "center",
  },
});
