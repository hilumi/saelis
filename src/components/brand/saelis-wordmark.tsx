import { APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

export interface SaelisWordmarkProps {
  className?: string;
  withTagline?: boolean;
}

export function SaelisWordmark({ className, withTagline = false }: SaelisWordmarkProps) {
  return (
    <span className={cn("inline-flex flex-col", className)}>
      <span className="text-xl font-semibold tracking-[0.18em] text-ink">{APP_NAME}</span>
      {withTagline ? (
        <span className="text-xs tracking-wide text-ink-soft">Come as you are.</span>
      ) : null}
    </span>
  );
}
