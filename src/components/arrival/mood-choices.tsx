"use client";

import { Choice } from "@/components/ui/choice";

import type { Mood } from "@/types/arrival";

const MOOD_OPTIONS: Array<{ value: Mood; label: string; description: string }> = [
  { value: "heavy", label: "Heavy", description: "Carrying a lot today" },
  { value: "tender", label: "Tender", description: "Feelings close to the surface" },
  { value: "flat", label: "Flat", description: "Not much of anything" },
  { value: "steady", label: "Steady", description: "On even ground" },
  { value: "hopeful", label: "Hopeful", description: "Something is opening up" },
  { value: "bright", label: "Bright", description: "Genuinely good" },
  { value: "tangled", label: "Tangled", description: "Hard to name" },
];

export function MoodChoices({
  value,
  onChange,
}: {
  value: Mood | null;
  onChange: (mood: Mood) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 font-medium text-ink">How does today feel?</legend>
      {MOOD_OPTIONS.map((option) => (
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
