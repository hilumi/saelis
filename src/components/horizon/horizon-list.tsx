"use client";

import { useState } from "react";

import { TheLight } from "@/components/brand/the-light";
import { HorizonProgress } from "@/components/horizon/horizon-progress";
import { HorizonStep } from "@/components/horizon/horizon-step";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineNotice } from "@/components/ui/inline-notice";

import type { ActionResult } from "@/types/actions";

export interface HorizonListItem {
  id: string;
  title: string;
  description: string;
  estimatedMinutes: number;
  completed: boolean;
}

export interface HorizonListProps {
  steps: HorizonListItem[];
  toggleAction?: (stepId: string, completed: boolean) => Promise<ActionResult>;
}

export function HorizonList({ steps, toggleAction }: HorizonListProps) {
  const [items, setItems] = useState(steps);
  const [error, setError] = useState<string | null>(null);

  if (items.length === 0) {
    return (
      <EmptyState
        visual={<TheLight state="resting" size={80} />}
        title="Your horizon is clear."
        body="No steps waiting, and that's a fine place to be. When a conversation surfaces one manageable next step, it will rest here — never more than you can carry."
      />
    );
  }

  const completedCount = items.filter((item) => item.completed).length;

  async function handleToggle(stepId: string, completed: boolean) {
    setError(null);
    if (toggleAction) {
      const result = await toggleAction(stepId, completed);
      if (!result.ok) {
        setError(result.error);
        return;
      }
    }
    setItems((current) =>
      current.map((item) => (item.id === stepId ? { ...item, completed } : item)),
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <HorizonProgress completed={completedCount} total={items.length} />
      {error ? <InlineNotice tone="error">{error}</InlineNotice> : null}
      {items.map((item) => (
        <HorizonStep
          key={item.id}
          title={item.title}
          description={item.description}
          estimatedMinutes={item.estimatedMinutes}
          completed={item.completed}
          onToggle={(completed) => void handleToggle(item.id, completed)}
        />
      ))}
    </div>
  );
}
