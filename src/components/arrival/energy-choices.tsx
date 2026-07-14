"use client";

import { Choice } from "@/components/ui/choice";

import type { Energy } from "@/types/arrival";

const ENERGY_OPTIONS: Array<{ value: Energy; label: string; description: string }> = [
  { value: "empty", label: "Running on empty", description: "Very little left" },
  { value: "low", label: "Low", description: "Moving slowly" },
  { value: "enough", label: "Enough", description: "Enough for what matters" },
  { value: "full", label: "Full", description: "Energy to spare" },
];

export function EnergyChoices({
  value,
  onChange,
}: {
  value: Energy | null;
  onChange: (energy: Energy) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 font-medium text-ink">How much energy is there?</legend>
      {ENERGY_OPTIONS.map((option) => (
        <Choice
          key={option.value}
          label={option.label}
          description={option.description}
          selected={value === option.value}
          onSelect={() => onChange(option.value)}
        />
      ))}
    </fieldset>
  );
}
