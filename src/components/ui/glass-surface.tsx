import { cn } from "@/lib/utils";

import type { HTMLAttributes } from "react";

/** Pearl glass panel — the standard Saelis content surface. */
export function GlassSurface({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("glass-surface p-6", className)} {...props} />;
}
