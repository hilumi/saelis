"use client";

import { minutesLabel } from "@/lib/dates";
import { cn } from "@/lib/utils";

export interface HorizonStepProps {
  title: string;
  description: string;
  estimatedMinutes: number;
  completed: boolean;
  onToggle?: (completed: boolean) => void;
}

export function HorizonStep({
  title,
  description,
  estimatedMinutes,
  completed,
  onToggle,
}: HorizonStepProps) {
  return (
    <div className="glass-surface flex items-start gap-4 p-5">
      <button
        type="button"
        role="checkbox"
        aria-checked={completed}
        aria-label={`Mark "${title}" as ${completed ? "not done" : "done"}`}
        onClick={() => onToggle?.(!completed)}
        className={cn(
          "mt-0.5 flex size-11 flex-none items-center justify-center rounded-full border text-lg",
          completed
            ? "border-quiet-mint bg-cloud-mint text-ink"
            : "border-ink-muted text-transparent",
        )}
      >
        ✓
      </button>
      <div className="min-w-0">
        <h3
          className={cn(
            "font-semibold text-ink",
            completed && "line-through decoration-2 opacity-70",
          )}
        >
          {title}
        </h3>
        <p className="text-ink-soft">{description}</p>
        <p className="mt-1 text-sm text-ink-muted">{minutesLabel(estimatedMinutes)}</p>
      </div>
    </div>
  );
}
