"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { InlineNotice } from "@/components/ui/inline-notice";

import type { ActionResult } from "@/types/actions";

export interface DataDeletionSectionProps {
  deleteConversations: () => Promise<ActionResult>;
  deleteArrivals: () => Promise<ActionResult>;
  deleteHorizonSteps: () => Promise<ActionResult>;
  deleteMemories: () => Promise<ActionResult>;
  deleteAccount: () => Promise<ActionResult>;
  /** Full account deletion needs the server secret key; the button is disabled until configured. */
  accountDeletionAvailable: boolean;
}

type PendingAction = {
  key: string;
  label: string;
  description: string;
  run: () => Promise<ActionResult>;
};

/**
 * Development data deletion. Every action requires an explicit confirmation
 * dialog. Deletion is permanent.
 */
export function DataDeletionSection({
  deleteConversations,
  deleteArrivals,
  deleteHorizonSteps,
  deleteMemories,
  deleteAccount,
  accountDeletionAvailable,
}: DataDeletionSectionProps) {
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [working, setWorking] = useState(false);
  const [result, setResult] = useState<{ label: string; outcome: ActionResult } | null>(null);

  const actions: PendingAction[] = [
    {
      key: "conversations",
      label: "Delete all conversations",
      description: "Every conversation and turn is permanently removed.",
      run: deleteConversations,
    },
    {
      key: "arrivals",
      label: "Delete all arrivals",
      description: "Every arrival check-in is permanently removed.",
      run: deleteArrivals,
    },
    {
      key: "horizon",
      label: "Delete all horizon steps",
      description: "Every step, finished or not, is permanently removed.",
      run: deleteHorizonSteps,
    },
    {
      key: "memories",
      label: "Delete all companion memories",
      description: "Everything Saelis was allowed to remember is permanently removed.",
      run: deleteMemories,
    },
  ];

  async function confirmPending() {
    if (!pending || working) return;
    setWorking(true);
    const outcome = await pending.run();
    setWorking(false);
    setResult({ label: pending.label, outcome });
    setPending(null);
  }

  return (
    <section aria-labelledby="data-deletion-heading" className="flex flex-col gap-3">
      <h2 id="data-deletion-heading" className="text-lg font-semibold text-ink">
        Delete your data
      </h2>
      <p className="text-sm text-ink-soft">
        Deletion is permanent. Saelis keeps nothing you&apos;ve asked it to let go of.
      </p>

      {actions.map((action) => (
        <div key={action.key} className="flex items-center justify-between gap-4">
          <p className="text-sm text-ink-soft">{action.description}</p>
          <Button variant="danger" onClick={() => setPending(action)}>
            {action.label}
          </Button>
        </div>
      ))}

      <div className="mt-2 flex items-center justify-between gap-4 border-t border-cloud-lilac pt-4">
        <p className="text-sm text-ink-soft">
          {accountDeletionAvailable
            ? "Remove your account and everything in it."
            : "Full account deletion becomes available once the server is configured with privileged credentials (SUPABASE_SECRET_KEY)."}
        </p>
        <Button
          variant="danger"
          disabled={!accountDeletionAvailable}
          onClick={() =>
            setPending({
              key: "account",
              label: "Delete my account",
              description: "Your account and all data are permanently removed.",
              run: deleteAccount,
            })
          }
        >
          Delete my account
        </Button>
      </div>

      {result ? (
        <InlineNotice tone={result.outcome.ok ? "success" : "error"}>
          {result.outcome.ok ? `Done: ${result.label.toLowerCase()}.` : result.outcome.error}
        </InlineNotice>
      ) : null}

      <Dialog
        open={pending !== null}
        onClose={() => setPending(null)}
        title={pending ? pending.label : "Confirm"}
      >
        <p className="mb-4 text-ink-soft">
          {pending?.description} This cannot be undone. Are you sure?
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setPending(null)} disabled={working}>
            Keep my data
          </Button>
          <Button variant="danger" onClick={() => void confirmPending()} disabled={working}>
            {working ? "Deleting…" : "Yes, delete permanently"}
          </Button>
        </div>
      </Dialog>
    </section>
  );
}
