import { cn } from "@/lib/utils";

import type { CSSProperties, ReactNode } from "react";

/** Decorative sky layer: aria-hidden, never intercepts pointer events. */
export function SkyLayer({
  className,
  style,
  children,
}: {
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}) {
  return (
    <div aria-hidden="true" className={cn("sky-layer", className)} style={style}>
      {children}
    </div>
  );
}
