import type { ReactNode } from "react";

export interface EmptyStateProps {
  title: string;
  body: string;
  visual?: ReactNode;
  action?: ReactNode;
}

/** A quiet empty state — an invitation, never a nag. */
export function EmptyState({ title, body, visual, action }: EmptyStateProps) {
  return (
    <div className="glass-surface flex flex-col items-center gap-4 px-6 py-12 text-center">
      {visual}
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      <p className="max-w-md text-ink-soft">{body}</p>
      {action}
    </div>
  );
}
