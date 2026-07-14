import { cn } from "@/lib/utils";

import type { TextareaHTMLAttributes } from "react";

export interface TextareaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  id: string;
  label: string;
  error?: string | null;
  hint?: string;
}

export function TextareaField({ id, label, error, hint, className, ...props }: TextareaFieldProps) {
  const errorId = error ? `${id}-error` : undefined;
  const hintId = hint ? `${id}-hint` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="font-medium text-ink">
        {label}
      </label>
      {hint ? (
        <p id={hintId} className="text-sm text-ink-soft">
          {hint}
        </p>
      ) : null}
      <textarea
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={[hintId, errorId].filter(Boolean).join(" ") || undefined}
        className={cn(
          "glass-surface min-h-28 w-full resize-y rounded-2xl px-4 py-3 text-ink placeholder:text-ink-muted",
          error && "border-2 border-accent-blush",
          className,
        )}
        {...props}
      />
      {error ? (
        <p id={errorId} className="text-sm text-[#a04a5e]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
