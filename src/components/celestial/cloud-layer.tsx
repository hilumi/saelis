import { cn } from "@/lib/utils";

export interface CloudLayerProps {
  variant: "high" | "mid" | "low";
  className?: string;
}

/** One soft, slow cloud band. Purely decorative. */
export function CloudLayer({ variant, className }: CloudLayerProps) {
  return (
    <div aria-hidden="true" className={cn("cloud-layer", `cloud-layer--${variant}`, className)} />
  );
}
