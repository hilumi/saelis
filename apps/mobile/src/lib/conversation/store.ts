import type { CompanionStreamEvent, ConversationTurn } from "@saelis/shared";

/**
 * Pure conversation store — the state machine behind the chat screen.
 * All I/O is injected (`sendStream`), so send/stream/cancel/retry, duplicate
 * prevention, partial-text preservation, and ordering are unit-testable.
 *
 * Server contract this leans on (see /api/companion/stream): nothing is
 * persisted unless the stream completes, so a failed or cancelled exchange
 * can be retried with a NEW requestId without ever duplicating saved
 * messages. Completed requestIds are remembered server-side, so a requestId
 * is never reused.
 */

export type MessageStatus = "complete" | "pending" | "streaming" | "failed" | "cancelled";

export interface ChatMessage {
  localId: string;
  role: "user" | "assistant";
  content: string;
  status: MessageStatus;
  createdAt: string;
}

export type ConversationPhase = "idle" | "sending" | "streaming";

export interface ConversationState {
  conversationId: string | null;
  messages: ChatMessage[];
  phase: ConversationPhase;
  /** Calm, user-facing failure copy for the last exchange (banner). */
  error: string | null;
  /** True when the last failure is worth retrying. */
  canRetry: boolean;
  /** Temporary mode: no new long-term companion memories this session. */
  temporaryMode: boolean;
}

export interface SendStreamParams {
  message: string;
  conversationId: string | null;
  requestId: string;
  /** Temporary conversation mode: the server creates no new long-term memories. */
  temporary: boolean;
}

export interface SendStreamHandlers {
  signal: AbortSignal;
  onEvent(event: CompanionStreamEvent): void;
}

export interface ConversationStoreDeps {
  sendStream(params: SendStreamParams, handlers: SendStreamHandlers): Promise<void>;
  onChange(state: ConversationState): void;
  now?: () => string;
  makeId?: () => string;
}

export interface ConversationStore {
  getState(): ConversationState;
  /** Send a message. Returns false when refused (blank, or already busy). */
  send(text: string): Promise<boolean>;
  /** Retry the last failed/cancelled exchange (new requestId; no duplicates). */
  retry(): Promise<boolean>;
  /** Stop the in-flight generation, preserving any partial text. */
  cancel(): void;
  /** Replace state with a loaded conversation (deterministic order). */
  loadConversation(conversationId: string | null, turns: ConversationTurn[]): void;
  /** Start a fresh conversation (cancels any in-flight generation). */
  startNew(): void;
  /** Toggle temporary conversation mode (applies to subsequent sends). */
  setTemporaryMode(enabled: boolean): void;
}

let idCounter = 0;
function defaultMakeId(): string {
  idCounter += 1;
  return `m-${Date.now().toString(36)}-${idCounter.toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

/** Server requires 8–64 chars of [a-zA-Z0-9-]; never reused across attempts. */
export function makeRequestId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export function createConversationStore(deps: ConversationStoreDeps): ConversationStore {
  const now = deps.now ?? (() => new Date().toISOString());
  const makeId = deps.makeId ?? defaultMakeId;

  let state: ConversationState = {
    conversationId: null,
    messages: [],
    phase: "idle",
    error: null,
    canRetry: false,
    temporaryMode: false,
  };
  let abortController: AbortController | null = null;
  let cancelRequested = false;

  function setState(patch: Partial<ConversationState>): void {
    state = { ...state, ...patch };
    deps.onChange(state);
  }

  function updateMessage(localId: string, patch: Partial<ChatMessage>): void {
    setState({
      messages: state.messages.map((message) =>
        message.localId === localId ? { ...message, ...patch } : message,
      ),
    });
  }

  async function run(text: string): Promise<boolean> {
    const userMessage: ChatMessage = {
      localId: makeId(),
      role: "user",
      content: text,
      status: "pending",
      createdAt: now(),
    };
    setState({
      messages: [...state.messages, userMessage],
      phase: "sending",
      error: null,
      canRetry: false,
    });

    let assistantId: string | null = null;
    let streamedText = "";
    let completed = false;
    let serverError: { message: string; retryable: boolean } | null = null;

    const ensureAssistantMessage = (): string => {
      if (assistantId) return assistantId;
      assistantId = makeId();
      setState({
        messages: [
          ...state.messages,
          {
            localId: assistantId,
            role: "assistant",
            content: "",
            status: "streaming",
            createdAt: now(),
          },
        ],
      });
      return assistantId;
    };

    abortController = new AbortController();
    cancelRequested = false;

    try {
      await deps.sendStream(
        {
          message: text,
          conversationId: state.conversationId,
          requestId: makeRequestId(),
          temporary: state.temporaryMode,
        },
        {
          signal: abortController.signal,
          onEvent: (event) => {
            switch (event.type) {
              case "start":
                setState({ phase: "streaming" });
                break;
              case "delta": {
                const id = ensureAssistantMessage();
                streamedText += event.data.text;
                updateMessage(id, { content: streamedText });
                break;
              }
              case "complete": {
                completed = true;
                const id = ensureAssistantMessage();
                // The final message is authoritative (plan enforcement may
                // adjust streamed text).
                updateMessage(id, { content: event.data.response.message, status: "complete" });
                updateMessage(userMessage.localId, { status: "complete" });
                setState({ conversationId: event.data.conversationId ?? state.conversationId });
                break;
              }
              case "error":
                serverError = { message: event.data.message, retryable: event.data.retryable };
                break;
            }
          },
        },
      );
    } catch (error) {
      if (!completed && !cancelRequested) {
        serverError = serverError ?? {
          message:
            error instanceof Error && error.name !== "AbortError"
              ? error.message
              : "Saelis had trouble responding just now. Nothing you wrote was lost.",
          retryable: true,
        };
      }
    } finally {
      abortController = null;
    }

    if (completed) {
      setState({ phase: "idle", error: null, canRetry: false });
      return true;
    }

    // Failure or cancellation: the server saved nothing. Keep any partial
    // streamed text visibly incomplete, and mark the user message so failed
    // (retryable) is clearly distinct from sent.
    const finalStatus: MessageStatus = cancelRequested ? "cancelled" : "failed";
    if (assistantId && streamedText.length > 0) {
      updateMessage(assistantId, { status: finalStatus });
    } else if (assistantId) {
      setState({ messages: state.messages.filter((message) => message.localId !== assistantId) });
    }
    updateMessage(userMessage.localId, { status: finalStatus });
    setState({
      phase: "idle",
      error: cancelRequested ? null : (serverError?.message ?? null),
      canRetry: true,
    });
    return false;
  }

  return {
    getState: () => state,

    async send(text: string): Promise<boolean> {
      const trimmed = text.trim();
      // Blank submissions and duplicate sends are refused deterministically.
      if (trimmed.length === 0 || state.phase !== "idle") return false;
      return run(trimmed);
    },

    async retry(): Promise<boolean> {
      if (state.phase !== "idle" || !state.canRetry) return false;
      // Find the last failed/cancelled user message and re-send exactly it,
      // removing the failed exchange first so no duplicates can appear.
      const failedUser = [...state.messages]
        .reverse()
        .find(
          (message) =>
            message.role === "user" &&
            (message.status === "failed" || message.status === "cancelled"),
        );
      if (!failedUser) return false;
      const failedIndex = state.messages.findIndex(
        (message) => message.localId === failedUser.localId,
      );
      setState({
        messages: state.messages.slice(0, failedIndex),
        error: null,
        canRetry: false,
      });
      return run(failedUser.content);
    },

    cancel(): void {
      if (!abortController) return;
      cancelRequested = true;
      abortController.abort();
    },

    loadConversation(conversationId, turns): void {
      // Deterministic order: createdAt ascending, id as tiebreaker.
      const sorted = [...turns].sort((a, b) =>
        a.createdAt === b.createdAt
          ? a.id.localeCompare(b.id)
          : a.createdAt.localeCompare(b.createdAt),
      );
      setState({
        conversationId,
        messages: sorted
          .filter((turn) => turn.role !== "system")
          .map((turn) => ({
            localId: turn.id,
            role: turn.role as "user" | "assistant",
            content: turn.content,
            status: "complete" as const,
            createdAt: turn.createdAt,
          })),
        phase: "idle",
        error: null,
        canRetry: false,
      });
    },

    startNew(): void {
      if (abortController) {
        cancelRequested = true;
        abortController.abort();
      }
      setState({
        conversationId: null,
        messages: [],
        phase: "idle",
        error: null,
        canRetry: false,
      });
    },

    setTemporaryMode(enabled: boolean): void {
      setState({ temporaryMode: enabled });
    },
  };
}
