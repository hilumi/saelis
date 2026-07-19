import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import type { ConversationSummary } from "@saelis/shared";

import { GlassSurface } from "@/components/glass-surface";
import { InlineNotice } from "@/components/inline-notice";
import { SaelisText } from "@/components/saelis-text";
import { Screen } from "@/components/screen";
import { useConversation } from "@/lib/conversation/provider";
import { colors, spacing } from "@/theme";

/** Conversation history: pick a past conversation or start a fresh one. */
export default function ConversationsScreen() {
  const router = useRouter();
  const {
    conversations,
    conversationsError,
    refreshConversations,
    selectConversation,
    startNew,
    state,
  } = useConversation();
  const [openingId, setOpeningId] = useState<string | null>(null);

  useEffect(() => {
    void refreshConversations();
  }, [refreshConversations]);

  async function open(conversation: ConversationSummary) {
    if (openingId) return;
    setOpeningId(conversation.id);
    try {
      await selectConversation(conversation.id);
      router.back();
    } catch {
      setOpeningId(null);
    }
  }

  function handleNew() {
    startNew();
    router.back();
  }

  function titleFor(conversation: ConversationSummary): string {
    if (conversation.title) return conversation.title;
    const date = new Date(conversation.updatedAt);
    return `Conversation from ${date.toLocaleDateString(undefined, {
      month: "long",
      day: "numeric",
    })}`;
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
        <SaelisText variant="title">Your conversations</SaelisText>
      </View>

      {conversationsError ? (
        <View style={styles.notice}>
          <InlineNotice tone="error">{conversationsError}</InlineNotice>
        </View>
      ) : null}

      <FlatList
        data={conversations}
        keyExtractor={(conversation) => conversation.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const isCurrent = item.id === state.conversationId;
          return (
            <Pressable
              onPress={() => void open(item)}
              disabled={openingId !== null}
              accessibilityRole="button"
              accessibilityLabel={`Open ${titleFor(item)}`}
            >
              <GlassSurface style={[styles.item, isCurrent && styles.itemCurrent]}>
                <SaelisText variant="section">{titleFor(item)}</SaelisText>
                <SaelisText variant="meta" color="muted">
                  {isCurrent
                    ? "Current conversation"
                    : new Date(item.updatedAt).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                </SaelisText>
              </GlassSurface>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          conversationsError ? null : (
            <GlassSurface style={styles.empty}>
              <SaelisText variant="section">Nothing here yet.</SaelisText>
              <SaelisText variant="body" color="secondary">
                Your conversations with Saelis will gather here, ready to return to.
              </SaelisText>
            </GlassSurface>
          )
        }
        ListHeaderComponent={
          <Pressable
            onPress={handleNew}
            accessibilityRole="button"
            accessibilityLabel="Start a new conversation"
          >
            <GlassSurface tone="strong" style={styles.newItem}>
              <Ionicons name="add" size={20} color={colors.text.primary} />
              <SaelisText variant="section">Start a new conversation</SaelisText>
            </GlassSurface>
          </Pressable>
        }
      />
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
  notice: {
    paddingBottom: spacing.md,
  },
  list: {
    gap: spacing.md,
    paddingBottom: spacing["3xl"],
  },
  item: {
    gap: spacing.xs,
  },
  itemCurrent: {
    borderColor: colors.accent.lilac,
    borderWidth: 1,
  },
  newItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  empty: {
    gap: spacing.sm,
  },
});
