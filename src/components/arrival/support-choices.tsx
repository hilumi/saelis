"use client";

import { Choice } from "@/components/ui/choice";

import type { SupportNeed } from "@/types/arrival";

const SUPPORT_OPTIONS: Array<{ value: SupportNeed; label: string; description: string }> = [
  { value: "listen", label: "Just listen", description: "No fixing, no advice" },
  { value: "comfort", label: "Comfort", description: "A soft place to land" },
  { value: "clarify", label: "Think clearly", description: "Untangle what's here" },
  { value: "decide", label: "Decide something", description: "Help weighing a choice" },
  { value: "communicate", label: "Say something hard", description: "Find the words" },
  { value: "celebrate", label: "Celebrate", description: "Something went right" },
  { value: "faith", label: "Faith reflection", description: "A quieter, deeper look" },
  { value: "presence", label: "Just be here", description: "Company without words" },
  { value: "next-step", label: "One next step", description: "Something small and doable" },
  { value: "stillness", label: "Stillness", description: "A few quiet minutes" },
];

export function SupportChoices({
  value,
  onChange,
}: {
  value: SupportNeed | null;
  onChange: (need: SupportNeed) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 font-medium text-ink">What would help most right now?</legend>
      {SUPPORT_OPTIONS.map((option) => (
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
