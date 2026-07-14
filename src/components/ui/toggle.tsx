"use client";

import { useId } from "react";

import { cn } from "@/lib/utils";

export interface ToggleProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

/** Accessible switch. State is conveyed by position AND the on/off track, not color alone. */
export function Toggle({ label, description, checked, onChange, disabled }: ToggleProps) {
  const labelId = useId();
  const descriptionId = useId();

  return (
    <div className="flex min-h-11 items-start justify-between gap-4 py-1">
      <span className="flex flex-col">
        <span id={labelId} className="font-medium text-ink">
          {label}
        </span>
        {description ? (
          <span id={descriptionId} className="text-sm text-ink-soft">
            {description}
          </span>
        ) : null}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={labelId}
        aria-describedby={description ? descriptionId : undefined}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-7 w-12 flex-none rounded-full border transition-colors disabled:opacity-50",
          checked ? "border-accent-lilac bg-accent-lilac" : "border-ink-muted bg-cloud-lilac",
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "absolute top-0.5 size-5.5 rounded-full bg-white shadow transition-transform",
            checked ? "left-0.5 translate-x-5" : "left-0.5 translate-x-0",
          )}
          style={{ width: "1.375rem", height: "1.375rem" }}
        />
      </button>
    </div>
  );
}
