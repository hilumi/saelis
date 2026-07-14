"use client";

import { Toggle } from "@/components/ui/toggle";

/**
 * Optional faith reflection — always opt-in, never assumed.
 */
export function FaithChoice({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (include: boolean) => void;
}) {
  return (
    <Toggle
      label="Include faith reflection"
      description="Entirely optional. Saelis will only bring a faith lens if you ask for it."
      checked={value}
      onChange={onChange}
    />
  );
}
