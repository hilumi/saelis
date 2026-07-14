import { ClosingLine } from "@/components/companion/closing-line";
import { cn } from "@/lib/utils";

import type { SupportMode } from "@/types/companion";

export interface ConversationTurnProps {
  role: "user" | "assistant";
  content: string;
  supportMode?: SupportMode | null;
  closingLine?: string | null;
}

const supportModeLabels: Record<SupportMode, string> = {
  witness: "Witnessing",
  explore: "Exploring",
  comfort: "Comfort",
  clarify: "Clarifying",
  act: "One step",
  celebrate: "Celebrating",
  connect: "Connection",
  reflect: "Reflecting",
  presence: "Presence",
};

export function ConversationTurn({
  role,
  content,
  supportMode,
  closingLine,
}: ConversationTurnProps) {
  const isUser = role === "user";
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-3xl px-5 py-4",
          isUser ? "bg-cloud-lilac text-ink" : "glass-surface text-ink",
        )}
      >
        {!isUser && supportMode ? (
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-muted">
            {supportModeLabels[supportMode]}
          </p>
        ) : null}
        <p className="whitespace-pre-wrap leading-relaxed">{content}</p>
        {!isUser && closingLine ? <ClosingLine text={closingLine} /> : null}
      </div>
    </div>
  );
}
