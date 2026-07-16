"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { COMPANION_MAX_MESSAGE_LENGTH } from "@/lib/constants";

export interface ConversationComposerProps {
  /**
   * Return false to indicate failure — the draft is preserved in the composer
   * so nothing the user wrote is lost. Any other result clears the field.
   */
  onSend: (message: string) => Promise<boolean | void> | boolean | void;
  disabled?: boolean;
}

/**
 * Unsent drafts survive accidental reloads and navigation within the tab:
 * the draft mirrors to sessionStorage (this device, this tab, never the
 * server) and clears on successful send.
 */
const DRAFT_KEY = "saelis-composer-draft";

function readDraft(): string {
  try {
    return sessionStorage.getItem(DRAFT_KEY) ?? "";
  } catch {
    return "";
  }
}

function writeDraft(value: string) {
  try {
    if (value) {
      sessionStorage.setItem(DRAFT_KEY, value);
    } else {
      sessionStorage.removeItem(DRAFT_KEY);
    }
  } catch {
    // Private mode or storage unavailable — the in-memory draft still works.
  }
}

export function ConversationComposer({ onSend, disabled = false }: ConversationComposerProps) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  // Restore any unsent draft after mount (client-only storage).
  useEffect(() => {
    const draft = readDraft();
    if (draft) setMessage(draft);
  }, []);

  const canSend = message.trim().length > 0 && !disabled && !sending;

  function updateMessage(value: string) {
    setMessage(value);
    writeDraft(value);
  }

  async function handleSend() {
    if (!canSend) return;
    const text = message.trim();
    setSending(true);
    try {
      const result = await onSend(text);
      if (result !== false) {
        setMessage("");
        writeDraft("");
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void handleSend();
      }}
      className="glass-surface sticky bottom-[env(safe-area-inset-bottom)] flex items-end gap-3 p-3"
    >
      <label htmlFor="composer-message" className="sr-only">
        Your message
      </label>
      <textarea
        id="composer-message"
        value={message}
        onChange={(event) => updateMessage(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            void handleSend();
          }
        }}
        maxLength={COMPANION_MAX_MESSAGE_LENGTH}
        rows={2}
        placeholder="Say anything, or nothing in particular…"
        className="min-h-11 min-w-0 flex-1 resize-none bg-transparent px-2 py-2 text-ink placeholder:text-ink-muted focus:outline-none"
      />
      <Button type="submit" disabled={!canSend}>
        {sending ? "Sending…" : "Send"}
      </Button>
    </form>
  );
}
