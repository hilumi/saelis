import { cn } from "@/lib/utils";

import type { ReactNode } from "react";

type NoticeTone = "info" | "success" | "error";

const toneClasses: Record<NoticeTone, string> = {
  info: "bg-cloud-blue border-accent-blue/40",
  success: "bg-cloud-mint border-quiet-mint",
  error: "bg-cloud-pink border-accent-blush",
};

const toneMarks: Record<NoticeTone, string> = {
  info: "◦",
  success: "✓",
  error: "!",
};

export interface InlineNoticeProps {
  tone?: NoticeTone;
  children: ReactNode;
  className?: string;
}

/**
 * Inline status message. Errors use role="alert"; others use a polite
 * live region. Tone is conveyed by a mark as well as color.
 */
export function InlineNotice({ tone = "info", children, className }: InlineNoticeProps) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2 rounded-2xl border px-4 py-3 text-sm text-ink",
        toneClasses[tone],
        className,
      )}
    >
      <span aria-hidden="true" className="font-semibold">
        {toneMarks[tone]}
      </span>
      <span>{children}</span>
    </div>
  );
}
