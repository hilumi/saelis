import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { COMPANION_MAX_MESSAGE_LENGTH } from "@saelis/shared";

import { GlassSurface } from "@/components/glass-surface";
import { InlineNotice } from "@/components/inline-notice";
import { LaunchScreen } from "@/components/launch-screen";
import { MessageBubble } from "@/components/message-bubble";
import { SaelisText } from "@/components/saelis-text";
import { Screen } from "@/components/screen";
import { ThinkingIndicator } from "@/components/thinking-indicator";
import { trackEvent } from "@/lib/analytics";
import { useConversation } from "@/lib/conversation/provider";
import type { ChatMessage } from "@/lib/conversation/store";
import { colors, glass, manropeFamilies, minTouchTarget, radii, spacing } from "@/theme";

/** Optional conversation starters — submitted through the ordinary flow. */
const CONVERSATION_STARTERS: { key: string; text: string }[] = [
  { key: "sort_day", text: "Help me sort through my day." },
  { key: "need_advice", text: "I need advice about something." },
  { key: "just_vent", text: "I don't need advice—I just need to vent." },
  { key: "make_plan", text: "Help me make a realistic plan." },
  { key: "wellness_check", text: "Check in with me about my wellness goal." },
];

/**
 * The live Saelis conversation. Streaming, retry, cancel, history restore —
 * state lives in the ConversationProvider; this screen only renders it.
 */
export default function ConversationScreen() {
  const router = useRouter();
  const { state, restoring, send, retry, cancel, startNew, refreshConversations } =
    useConversation();
  const [draft, setDraft] = useState("");
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const busy = state.phase !== "idle";
  const canSend = !busy && draft.trim().length > 0;

  const scrollToEnd = useCallback(() => {
    listRef.current?.scrollToEnd({ animated: true });
  }, []);

  async function handleSend() {
    if (!canSend) return;
    const text = draft;
    setDraft("");
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    const accepted = await send(text);
    if (!accepted) setDraft(text);
  }

  function handleCancel() {
    cancel();
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
  }

  function handleNew() {
    startNew();
    setDraft("");
  }

  function openHistory() {
    void refreshConversations();
    Keyboard.dismiss();
    router.push("/(app)/conversations");
  }

  if (restoring) {
    return <LaunchScreen />;
  }

  return (
    <Screen edges={{ bottom: false }}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
      >
        <View style={styles.header}>
          <SaelisText variant="title">Conversation</SaelisText>
          <View style={styles.headerActions}>
            <Pressable
              onPress={openHistory}
              accessibilityRole="button"
              accessibilityLabel="Conversation history"
              hitSlop={8}
              style={styles.headerButton}
            >
              <Ionicons name="time-outline" size={22} color={colors.text.secondary} />
            </Pressable>
            <Pressable
              onPress={handleNew}
              accessibilityRole="button"
              accessibilityLabel="New conversation"
              hitSlop={8}
              style={styles.headerButton}
            >
              <Ionicons name="add-circle-outline" size={24} color={colors.text.secondary} />
            </Pressable>
          </View>
        </View>

        {state.error ? (
          <View style={styles.notice}>
            <InlineNotice tone="error">{state.error}</InlineNotice>
          </View>
        ) : null}
        {state.temporaryMode ? (
          <View style={styles.notice} accessibilityLiveRegion="polite">
            <SaelisText variant="meta" color="muted">
              Temporary conversation — Saelis won’t keep any new memories from this session.
            </SaelisText>
          </View>
        ) : null}

        <FlatList
          ref={listRef}
          data={state.messages}
          keyExtractor={(message) => message.localId}
          renderItem={({ item }) => (
            <MessageBubble
              message={item}
              onRetry={
                state.canRetry && !busy && (item.status === "failed" || item.status === "cancelled")
                  ? () => void retry()
                  : undefined
              }
            />
          )}
          style={styles.flex}
          contentContainerStyle={styles.messages}
          onContentSizeChange={scrollToEnd}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <GlassSurface style={styles.empty}>
              <SaelisText variant="section">A quiet place to begin.</SaelisText>
              <SaelisText variant="conversation" color="secondary">
                Say anything — even a single word is a fine place to start. Or, if it helps:
              </SaelisText>
              <View style={styles.starters}>
                {CONVERSATION_STARTERS.map((starter) => (
                  <Pressable
                    key={starter.key}
                    onPress={() => {
                      trackEvent("conversation_starter_used", { starter_key: starter.key });
                      void send(starter.text);
                    }}
                    disabled={busy}
                    accessibilityRole="button"
                    accessibilityLabel={`Start with: ${starter.text}`}
                    style={({ pressed }) => [styles.starter, pressed && styles.starterPressed]}
                  >
                    <SaelisText variant="label">{starter.text}</SaelisText>
                  </Pressable>
                ))}
              </View>
            </GlassSurface>
          }
          ListFooterComponent={state.phase === "sending" ? <ThinkingIndicator /> : null}
          ListFooterComponentStyle={styles.footer}
        />

        <GlassSurface tone="strong" padded={false} style={styles.composer}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Say anything…"
            placeholderTextColor={colors.text.muted}
            multiline
            maxLength={COMPANION_MAX_MESSAGE_LENGTH}
            editable={!busy}
            accessibilityLabel="Message"
            style={styles.input}
          />
          {busy ? (
            <Pressable
              onPress={handleCancel}
              accessibilityRole="button"
              accessibilityLabel="Stop responding"
              style={styles.actionButton}
            >
              <Ionicons name="stop-circle-outline" size={30} color={colors.text.primary} />
            </Pressable>
          ) : (
            <Pressable
              onPress={() => void handleSend()}
              disabled={!canSend}
              accessibilityRole="button"
              accessibilityLabel="Send message"
              accessibilityState={{ disabled: !canSend }}
              style={[styles.actionButton, !canSend && styles.actionDisabled]}
            >
              <Ionicons
                name="arrow-up-circle"
                size={32}
                color={canSend ? colors.accent.lilac : colors.text.muted}
              />
            </Pressable>
          )}
        </GlassSurface>
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
    justifyContent: "space-between",
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  headerActions: {
    flexDirection: "row",
    gap: spacing.lg,
  },
  headerButton: {
    minWidth: 32,
    minHeight: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  notice: {
    paddingBottom: spacing.md,
  },
  messages: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
    flexGrow: 1,
  },
  footer: {
    paddingTop: spacing.md,
  },
  empty: {
    gap: spacing.sm,
    marginTop: spacing["3xl"],
  },
  starters: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  starter: {
    minHeight: 44,
    justifyContent: "center",
    borderRadius: radii.field,
    borderWidth: 1,
    borderColor: colors.sky.lilac,
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    paddingHorizontal: spacing.lg,
  },
  starterPressed: {
    opacity: 0.8,
  },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: spacing.sm,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  input: {
    flex: 1,
    minHeight: minTouchTarget,
    maxHeight: 120,
    borderRadius: radii.field,
    borderWidth: 1,
    borderColor: colors.sky.lilac,
    backgroundColor: glass.highlight,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    fontFamily: manropeFamilies["400"],
    fontSize: 17,
    color: colors.text.primary,
  },
  actionButton: {
    minWidth: minTouchTarget,
    minHeight: minTouchTarget,
    alignItems: "center",
    justifyContent: "center",
  },
  actionDisabled: {
    opacity: 0.6,
  },
});
