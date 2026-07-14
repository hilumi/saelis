"use client";

import { useState } from "react";

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

export function ConversationComposer({ onSend, disabled = false }: ConversationComposerProps) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const canSend = message.trim().length > 0 && !disabled && !sending;

  async function handleSend() {
    if (!canSend) return;
    const text = message.trim();
    setSending(true);
    try {
      const result = await onSend(text);
      if (result !== false) {
        setMessage("");
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
      className="glass-surface flex items-end gap-3 p-3"
    >
      <label htmlFor="composer-message" className="sr-only">
        Your message
      </label>
      <textarea
        id="composer-message"
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            void handleSend();
          }
        }}
        maxLength={COMPANION_MAX_MESSAGE_LENGTH}
        rows={2}
        placeholder="Say anything, or nothing in particular…"
        className="min-h-11 flex-1 resize-none bg-transparent px-2 py-2 text-ink placeholder:text-ink-muted focus:outline-none"
      />
      <Button type="submit" disabled={!canSend}>
        {sending ? "Sending…" : "Send"}
      </Button>
    </form>
  );
}
