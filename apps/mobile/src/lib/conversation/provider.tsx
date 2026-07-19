import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { ConversationSummary } from "@saelis/shared";

import { getSaelisApi } from "@/lib/api/saelis";
import {
  getMostRecentConversation,
  listConversations,
  listTurns,
} from "@/lib/conversation/history";
import { createConversationStore } from "@/lib/conversation/store";
import type { ConversationState } from "@/lib/conversation/store";

/**
 * Conversation context for the protected (app) group. Mounted only for
 * signed-in users; unmounts (and cancels any stream) on sign-out.
 *
 * Restore-after-relaunch: history lives server-side, so on mount the most
 * recent conversation is loaded — no conversation content is ever stored on
 * the device.
 */

interface ConversationContextValue {
  state: ConversationState;
  /** True while the initial restore (most recent conversation) runs. */
  restoring: boolean;
  conversations: ConversationSummary[];
  conversationsError: string | null;
  send(text: string): Promise<boolean>;
  retry(): Promise<boolean>;
  cancel(): void;
  startNew(): void;
  setTemporaryMode(enabled: boolean): void;
  selectConversation(id: string): Promise<void>;
  refreshConversations(): Promise<void>;
}

const ConversationContext = createContext<ConversationContextValue | null>(null);

export function ConversationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ConversationState>({
    conversationId: null,
    messages: [],
    phase: "idle",
    error: null,
    canRetry: false,
    temporaryMode: false,
  });
  const [restoring, setRestoring] = useState(true);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [conversationsError, setConversationsError] = useState<string | null>(null);

  // One store per provider lifetime (lazy useState init — no ref reads
  // during render).
  const [store] = useState(() =>
    createConversationStore({
      sendStream: (params, handlers) =>
        getSaelisApi().postStream(
          "/api/companion/stream",
          {
            message: params.message,
            conversationId: params.conversationId,
            requestId: params.requestId,
            temporary: params.temporary,
          },
          { signal: handlers.signal, onEvent: handlers.onEvent },
        ),
      onChange: setState,
    }),
  );

  const refreshConversations = useCallback(async () => {
    try {
      setConversations(await listConversations());
      setConversationsError(null);
    } catch (error) {
      setConversationsError(
        error instanceof Error ? error.message : "Could not load your conversations.",
      );
    }
  }, []);

  const selectConversation = useCallback(
    async (id: string) => {
      const turns = await listTurns(id);
      store.loadConversation(id, turns);
    },
    [store],
  );

  // Restore the most recent conversation after launch/sign-in.
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const recent = await getMostRecentConversation();
        if (recent && mounted) {
          const turns = await listTurns(recent.id);
          if (mounted) store.loadConversation(recent.id, turns);
        }
      } catch {
        // Quiet start: an empty conversation is a fine first state.
      } finally {
        if (mounted) setRestoring(false);
      }
    })();
    return () => {
      mounted = false;
      store.cancel();
    };
  }, [store]);

  const send = useCallback((text: string) => store.send(text), [store]);
  const retry = useCallback(() => store.retry(), [store]);
  const cancel = useCallback(() => store.cancel(), [store]);
  const startNew = useCallback(() => store.startNew(), [store]);
  const setTemporaryMode = useCallback(
    (enabled: boolean) => store.setTemporaryMode(enabled),
    [store],
  );

  const value = useMemo<ConversationContextValue>(
    () => ({
      state,
      restoring,
      conversations,
      conversationsError,
      send,
      retry,
      cancel,
      startNew,
      setTemporaryMode,
      selectConversation,
      refreshConversations,
    }),
    [
      state,
      restoring,
      conversations,
      conversationsError,
      send,
      retry,
      cancel,
      startNew,
      setTemporaryMode,
      selectConversation,
      refreshConversations,
    ],
  );

  return <ConversationContext.Provider value={value}>{children}</ConversationContext.Provider>;
}

export function useConversation(): ConversationContextValue {
  const context = useContext(ConversationContext);
  if (!context) {
    throw new Error("useConversation must be used inside ConversationProvider.");
  }
  return context;
}
