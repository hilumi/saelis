"use client";

import { useEffect, useRef, useState } from "react";

import { TheLight, type LightState } from "@/components/brand/the-light";
import { ConversationComposer } from "@/components/companion/conversation-composer";
import { ConversationTurn } from "@/components/companion/conversation-turn";
import { useSky } from "@/components/sky/use-sky";
import { Button } from "@/components/ui/button";
import { InlineNotice } from "@/components/ui/inline-notice";
import { newClientId } from "@/lib/ids";

import type { CompanionResponse } from "@/lib/ai/companion-contract";
import type { ActionResult } from "@/types/actions";
import type { SupportMode } from "@/types/companion";

interface DisplayTurn {
  id: string;
  role: "user" | "assistant";
  content: string;
  supportMode?: SupportMode | null;
  closingLine?: string | null;
  streaming?: boolean;
}

interface PendingMemory {
  category: string;
  content: string;
  reason: string;
}

interface FailureState {
  message: string;
  lastMessage: string;
}

export interface ConversationViewProps {
  approveMemoryAction: (input: {
    category: string;
    content: string;
    kind: "constellation" | "north-star";
    title: string | null;
    edited: boolean;
  }) => Promise<ActionResult>;
  feedbackAction?: (input: { helpful: boolean; category?: string | null }) => Promise<ActionResult>;
}

interface StreamEvent {
  event: string;
  data: Record<string, unknown>;
}

/** Parse complete SSE frames out of a growing buffer. */
export function drainSseBuffer(buffer: string): { events: StreamEvent[]; rest: string } {
  const events: StreamEvent[] = [];
  let rest = buffer;
  let separator = rest.indexOf("\n\n");
  while (separator !== -1) {
    const frame = rest.slice(0, separator);
    rest = rest.slice(separator + 2);
    let eventName = "message";
    let dataText = "";
    for (const line of frame.split("\n")) {
      if (line.startsWith("event: ")) eventName = line.slice(7).trim();
      if (line.startsWith("data: ")) dataText += line.slice(6);
    }
    if (dataText) {
      try {
        events.push({ event: eventName, data: JSON.parse(dataText) as Record<string, unknown> });
      } catch {
        // Malformed frame — skip rather than surface raw internals.
      }
    }
    separator = rest.indexOf("\n\n");
  }
  return { events, rest };
}

const CALM_ERROR = "Saelis had trouble responding. Nothing you wrote was lost.";

/**
 * Streaming conversation. Text arrives progressively (whole deltas — never a
 * character-by-character animation, so reduced-motion users get the same calm
 * experience). The Light listens on submit, receives while waiting, and
 * settles into the completed support mode's state.
 */
export function ConversationView({ approveMemoryAction, feedbackAction }: ConversationViewProps) {
  const [turns, setTurns] = useState<DisplayTurn[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<FailureState | null>(null);
  const [pendingMemory, setPendingMemory] = useState<PendingMemory | null>(null);
  const [memoryNotice, setMemoryNotice] = useState<string | null>(null);
  const [proposalDraft, setProposalDraft] = useState<string>("");
  const [proposalEditing, setProposalEditing] = useState(false);
  const [proposalKind, setProposalKind] = useState<"constellation" | "north-star">("constellation");
  const [memoryUseNotice, setMemoryUseNotice] = useState<string | null>(null);
  const [feedbackState, setFeedbackState] = useState<"idle" | "asking" | "done">("idle");
  const [reflectSuggestion, setReflectSuggestion] = useState<string | null>(null);

  // "Reflect with Saelis" hand-off: a short-lived client-side reference only.
  // Nothing is sent to the model until the user chooses to begin.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("saelis-reflect-memory");
      if (raw) {
        sessionStorage.removeItem("saelis-reflect-memory");
        const parsed = JSON.parse(raw) as { title?: string };
        if (parsed.title) setReflectSuggestion(parsed.title);
      }
    } catch {
      // no session storage — nothing to prefill
    }
  }, []);
  const [lightState, setLightState] = useState<LightState>("resting");
  const { state: sky } = useSky();
  const abortRef = useRef<AbortController | null>(null);

  function updateTurn(id: string, update: (turn: DisplayTurn) => DisplayTurn) {
    setTurns((current) => current.map((turn) => (turn.id === id ? update(turn) : turn)));
  }

  function removeTurn(id: string) {
    setTurns((current) => current.filter((turn) => turn.id !== id));
  }

  async function handleSend(message: string): Promise<boolean> {
    if (busy) return false;
    setFailure(null);
    setBusy(true);
    setLightState("listening");

    const requestId = newClientId();
    const abortController = new AbortController();
    abortRef.current = abortController;

    const userTurnId = newClientId();
    const assistantTurnId = newClientId();
    setTurns((current) => [...current, { id: userTurnId, role: "user", content: message }]);

    let receivedText = false;
    let completed = false;

    try {
      const response = await fetch("/api/companion/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, conversationId, requestId }),
        signal: abortController.signal,
      });

      if (!response.ok || !response.body) {
        let publicError = CALM_ERROR;
        try {
          const payload = (await response.json()) as { error?: string };
          if (payload.error) publicError = payload.error;
        } catch {
          // keep the calm default
        }
        removeTurn(userTurnId);
        setFailure({ message: publicError, lastMessage: message });
        setLightState("resting");
        return false;
      }

      setTurns((current) => [
        ...current,
        { id: assistantTurnId, role: "assistant", content: "", streaming: true },
      ]);
      setLightState("receiving");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const drained = drainSseBuffer(buffer);
        buffer = drained.rest;

        for (const event of drained.events) {
          if (event.event === "delta" && typeof event.data.text === "string") {
            const text = event.data.text;
            receivedText = true;
            updateTurn(assistantTurnId, (turn) => ({ ...turn, content: turn.content + text }));
          } else if (event.event === "complete") {
            completed = true;
            const companion = event.data.response as CompanionResponse;
            const nextConversationId = event.data.conversationId;
            const nextLightState = event.data.lightState;
            updateTurn(assistantTurnId, (turn) => ({
              ...turn,
              streaming: false,
              content: companion.followUp
                ? `${companion.message}\n\n${companion.followUp}`
                : companion.message,
              supportMode: companion.supportMode,
              closingLine: companion.closingLine,
            }));
            if (typeof nextConversationId === "string") setConversationId(nextConversationId);
            if (typeof nextLightState === "string") setLightState(nextLightState as LightState);
            if (companion.proposedMemory) {
              setPendingMemory(companion.proposedMemory);
              setProposalDraft(companion.proposedMemory.content);
              setProposalEditing(false);
              setProposalKind("constellation");
              setMemoryNotice(null);
            }
            const used = event.data.memoriesUsed;
            setMemoryUseNotice(
              typeof used === "number" && used > 0
                ? `Saelis used ${used === 1 ? "one memory" : `${used} memories`} you approved.`
                : null,
            );
            setFeedbackState("idle");
          } else if (event.event === "error") {
            const publicMessage =
              typeof event.data.message === "string" && event.data.message
                ? event.data.message
                : CALM_ERROR;
            removeTurn(assistantTurnId);
            setFailure({ message: publicMessage, lastMessage: message });
            setLightState("resting");
            return false;
          }
        }
      }

      if (!completed) {
        // Stream ended without a validated completion (e.g. a quiet pause).
        // Keep any visible text, settle The Light, allow retry.
        updateTurn(assistantTurnId, (turn) => ({ ...turn, streaming: false }));
        if (!receivedText) removeTurn(assistantTurnId);
        setLightState("resting");
      }
      return true;
    } catch (error) {
      const aborted =
        abortController.signal.aborted ||
        (error instanceof DOMException && error.name === "AbortError");
      if (aborted) {
        // A pause, not an alarm: keep visible text, no error banner.
        updateTurn(assistantTurnId, (turn) => ({ ...turn, streaming: false }));
        if (!receivedText) removeTurn(assistantTurnId);
        setLightState("resting");
        return true;
      }
      removeTurn(assistantTurnId);
      removeTurn(userTurnId);
      setFailure({ message: CALM_ERROR, lastMessage: message });
      setLightState("resting");
      return false;
    } finally {
      abortRef.current = null;
      setBusy(false);
    }
  }

  function handleStop() {
    abortRef.current?.abort();
  }

  async function handleApproveMemory() {
    if (!pendingMemory) return;
    const content = proposalDraft.trim() || pendingMemory.content;
    const result = await approveMemoryAction({
      category: pendingMemory.category,
      content,
      kind: proposalKind,
      title: null,
      edited: content !== pendingMemory.content,
    });
    setMemoryNotice(
      result.ok ? "Remembered — you can review or delete it any time." : result.error,
    );
    setPendingMemory(null);
  }

  async function handleFeedback(helpful: boolean, category?: string) {
    if (!feedbackAction) return;
    if (helpful || category) {
      setFeedbackState("done");
      await feedbackAction({ helpful, category: category ?? null });
    } else {
      setFeedbackState("asking");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-center">
        <TheLight state={lightState} skyTone={sky.lightTone} size={72} />
      </div>

      <div aria-live="polite" className="flex flex-col gap-4">
        {turns.length === 0 ? (
          <p className="text-center text-ink-soft">
            There&apos;s no wrong way to start. Saelis listens first.
          </p>
        ) : (
          turns.map((turn) => (
            <ConversationTurn
              key={turn.id}
              role={turn.role}
              content={turn.content || (turn.streaming ? "…" : "")}
              supportMode={turn.supportMode}
              closingLine={turn.closingLine}
            />
          ))
        )}
      </div>

      {busy ? (
        <div className="flex justify-center">
          <Button variant="ghost" onClick={handleStop}>
            Stop for now
          </Button>
        </div>
      ) : null}

      {pendingMemory ? (
        <div
          className="glass-surface flex flex-col gap-3 p-5"
          role="group"
          aria-label="Memory proposal"
        >
          {proposalEditing ? (
            <>
              <label htmlFor="proposal-edit" className="text-sm font-medium text-ink">
                Edit before saving
              </label>
              <textarea
                id="proposal-edit"
                value={proposalDraft}
                maxLength={1000}
                rows={2}
                onChange={(event) => setProposalDraft(event.target.value)}
                className="glass-surface rounded-2xl px-3 py-2 text-ink"
              />
            </>
          ) : (
            <p className="text-ink">
              Saelis would like to remember: <strong>“{proposalDraft}”</strong>
            </p>
          )}
          <p className="text-sm text-ink-soft">
            {pendingMemory.reason} Nothing is saved unless you agree.
          </p>
          <label htmlFor="proposal-kind" className="text-sm font-medium text-ink">
            Keep as
          </label>
          <select
            id="proposal-kind"
            value={proposalKind}
            onChange={(event) =>
              setProposalKind(event.target.value as "constellation" | "north-star")
            }
            className="glass-surface min-h-11 rounded-2xl px-3 text-ink"
          >
            <option value="constellation">Constellation — a helpful detail</option>
            <option value="north-star">North Star — a value or long-term intention</option>
          </select>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => void handleApproveMemory()}>Yes, remember this</Button>
            <Button variant="soft" onClick={() => setProposalEditing((value) => !value)}>
              {proposalEditing ? "Done editing" : "Edit before saving"}
            </Button>
            <Button variant="ghost" onClick={() => setPendingMemory(null)}>
              Not now
            </Button>
          </div>
        </div>
      ) : null}

      {memoryNotice ? <InlineNotice tone="info">{memoryNotice}</InlineNotice> : null}
      {memoryUseNotice ? (
        <p className="text-center text-xs text-ink-muted">{memoryUseNotice}</p>
      ) : null}

      {reflectSuggestion && turns.length === 0 && !busy ? (
        <div className="glass-surface flex flex-col gap-2 p-4" role="group" aria-label="Reflection">
          <p className="text-sm text-ink">
            You wanted to reflect on: <strong>{reflectSuggestion}</strong>
          </p>
          <div className="flex gap-2">
            <Button
              variant="soft"
              onClick={() => {
                const title = reflectSuggestion;
                setReflectSuggestion(null);
                void handleSend(
                  `I'd like to reflect on something I asked you to remember: "${title}".`,
                );
              }}
            >
              Begin reflection
            </Button>
            <Button variant="ghost" onClick={() => setReflectSuggestion(null)}>
              Not now
            </Button>
          </div>
        </div>
      ) : null}

      {feedbackAction &&
      !busy &&
      feedbackState !== "done" &&
      turns.at(-1)?.role === "assistant" &&
      !turns.at(-1)?.streaming ? (
        <div
          className="flex flex-wrap items-center justify-center gap-2"
          aria-label="Response feedback"
        >
          {feedbackState === "idle" ? (
            <>
              <Button variant="ghost" onClick={() => void handleFeedback(true)}>
                Helpful
              </Button>
              <Button variant="ghost" onClick={() => void handleFeedback(false)}>
                Not quite
              </Button>
            </>
          ) : (
            <>
              {[
                ["too-much-advice", "Too much advice"],
                ["too-long", "Too long"],
                ["too-generic", "Too generic"],
                ["missed-need", "Missed what I needed"],
                ["tone", "Tone felt wrong"],
                ["other", "Other"],
              ].map(([value, label]) => (
                <Button
                  key={value}
                  variant="soft"
                  onClick={() => void handleFeedback(false, value)}
                >
                  {label}
                </Button>
              ))}
            </>
          )}
        </div>
      ) : null}

      {failure ? (
        <div className="flex flex-col gap-2">
          <InlineNotice tone="error">{failure.message}</InlineNotice>
          <div>
            <Button
              variant="soft"
              disabled={busy}
              onClick={() => void handleSend(failure.lastMessage)}
            >
              Try again
            </Button>
          </div>
        </div>
      ) : null}

      <ConversationComposer onSend={handleSend} disabled={busy} />
    </div>
  );
}
