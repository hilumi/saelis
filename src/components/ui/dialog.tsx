"use client";

import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

import type { ReactNode } from "react";

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
}

/**
 * Accessible dialog built on the native <dialog> element: focus containment,
 * Escape to close, and backdrop dismissal come from the platform.
 */
export function Dialog({ open, onClose, title, children, className }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={onClose}
      aria-label={title}
      className={cn(
        "glass-surface m-auto w-full max-w-md bg-pearl-white p-6 backdrop:bg-ink/30",
        className,
      )}
    >
      <h2 className="type-section mb-3 text-ink">{title}</h2>
      {children}
    </dialog>
  );
}
