"use client";

import { cn } from "@/lib/utils";

export interface ChoiceProps {
  label: string;
  description?: string;
  selected: boolean;
  onSelect: () => void;
  className?: string;
}

/**
 * A selectable option rendered as a toggle button (aria-pressed).
 * Selection is conveyed by border + check mark, never color alone.
 */
export function Choice({ label, description, selected, onSelect, className }: ChoiceProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "glass-surface interactive-depth flex min-h-11 w-full items-center gap-3 px-4 py-3 text-left",
        selected
          ? "border-2 border-accent-lilac bg-cloud-lilac/40 shadow-[0_10px_26px_rgb(45_54_80/0.16)]"
          : "hover:bg-cloud-lilac/50 active:bg-cloud-lilac/60",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "flex size-5 flex-none items-center justify-center rounded-full border text-xs",
          selected ? "border-accent-lilac bg-accent-lilac text-white" : "border-ink-muted",
        )}
      >
        {selected ? "✓" : ""}
      </span>
      <span className="flex flex-col">
        <span className="font-medium text-ink">{label}</span>
        {description ? <span className="text-sm text-ink-soft">{description}</span> : null}
      </span>
    </button>
  );
}
