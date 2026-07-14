"use client";

import { useState } from "react";

import { TheLight } from "@/components/brand/the-light";
import { ConversationComposer } from "@/components/companion/conversation-composer";
import { ConversationTurn } from "@/components/companion/conversation-turn";
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
}

interface PendingMemory {
  category: string;
  content: string;
  reason: string;
}

export interface ConversationViewProps {
  approveMemoryAction: (input: { category: string; content: string }) => Promise<ActionResult>;
}

export function ConversationView({ approveMemoryAction }: ConversationViewProps) {
  const [turns, setTurns] = useState<DisplayTurn[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingMemory, setPendingMemory] = useState<PendingMemory | null>(null);
  const [memoryNotice, setMemoryNotice] = useState<string | null>(null);

  async function handleSend(message: string) {
    setError(null);
    setBusy(true);
    setTurns((current) => [...current, { id: newClientId(), role: "user", content: message }]);
    try {
      const response = await fetch("/api/companion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, conversationId }),
      });
      const payload = (await response.json()) as {
        conversationId?: string | null;
        response?: CompanionResponse;
        error?: string;
      };
      if (!response.ok || !payload.response) {
        setError(payload.error ?? "Saelis had trouble responding. Please try again.");
        return;
      }
      if (payload.conversationId) setConversationId(payload.conversationId);
      const companion = payload.response;
      setTurns((current) => [
        ...current,
        {
          id: newClientId(),
          role: "assistant",
          content: companion.followUp
            ? `${companion.message}\n\n${companion.followUp}`
            : companion.message,
          supportMode: companion.supportMode,
          closingLine: companion.closingLine,
        },
      ]);
      if (companion.proposedMemory) {
        setPendingMemory(companion.proposedMemory);
        setMemoryNotice(null);
      }
    } catch {
      setError("Saelis had trouble responding. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleApproveMemory() {
    if (!pendingMemory) return;
    const result = await approveMemoryAction({
      category: pendingMemory.category,
      content: pendingMemory.content,
    });
    setMemoryNotice(
      result.ok ? "Remembered — you can review or delete it any time." : result.error,
    );
    setPendingMemory(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-center">
        <TheLight state={busy ? "listening" : "resting"} size={72} />
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
              content={turn.content}
              supportMode={turn.supportMode}
              closingLine={turn.closingLine}
            />
          ))
        )}
      </div>

      {pendingMemory ? (
        <div
          className="glass-surface flex flex-col gap-3 p-5"
          role="group"
          aria-label="Memory proposal"
        >
          <p className="text-ink">
            Saelis would like to remember: <strong>“{pendingMemory.content}”</strong>
          </p>
          <p className="text-sm text-ink-soft">
            {pendingMemory.reason} Nothing is saved unless you agree.
          </p>
          <div className="flex gap-3">
            <Button onClick={() => void handleApproveMemory()}>Yes, remember this</Button>
            <Button variant="ghost" onClick={() => setPendingMemory(null)}>
              Not now
            </Button>
          </div>
        </div>
      ) : null}

      {memoryNotice ? <InlineNotice tone="info">{memoryNotice}</InlineNotice> : null}
      {error ? <InlineNotice tone="error">{error}</InlineNotice> : null}

      <ConversationComposer onSend={handleSend} disabled={busy} />
    </div>
  );
}
