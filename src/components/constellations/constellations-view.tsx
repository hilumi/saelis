"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineNotice } from "@/components/ui/inline-notice";
import { TheLight } from "@/components/brand/the-light";
import { assignMemoryStars, memoryLabel, type MemorySummary } from "@/lib/constellations/assign";
import { formatDate } from "@/lib/dates";
import { generateStars } from "@/lib/sky";

import type { ActionResult } from "@/types/actions";

export interface ConstellationMemory extends MemorySummary {
  reason: string | null;
  createdAt: string;
}

export interface ConstellationsViewProps {
  userSeed: string;
  memories: ConstellationMemory[];
  createAction: (input: unknown) => Promise<ActionResult>;
  deleteAction: (input: unknown) => Promise<ActionResult>;
}

/**
 * Constellations — approved memories among the Living Sky's deterministic
 * stars. More stars are not "better"; nothing here is scored or rewarded.
 * A full list view is always available, and every star is keyboard reachable.
 */
export function ConstellationsView({
  userSeed,
  memories: initialMemories,
  createAction,
  deleteAction,
}: ConstellationsViewProps) {
  const router = useRouter();
  const [memories, setMemories] = useState(initialMemories);
  const [view, setView] = useState<"sky" | "list">("sky");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [northStarDraft, setNorthStarDraft] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  const availableStars = useMemo(() => generateStars(`constellations:${userSeed}`, 90), [userSeed]);
  const memoryStars = useMemo(
    () => assignMemoryStars(memories, availableStars),
    [memories, availableStars],
  );
  const usedPositions = useMemo(
    () => new Set(memoryStars.map((star) => `${star.x}:${star.y}`)),
    [memoryStars],
  );

  const selected = memories.find((memory) => memory.id === selectedId) ?? null;
  const northStars = memories.filter((memory) => memory.kind === "north-star");

  async function handleDelete(memoryId: string) {
    const result = await deleteAction({ memoryId });
    if (result.ok) {
      setMemories((current) => current.filter((memory) => memory.id !== memoryId));
      setSelectedId(null);
      setNotice("Removed. Saelis will no longer use it.");
    } else {
      setNotice(result.error);
    }
  }

  function handleReflect(memory: ConstellationMemory) {
    // No private content in the URL — a short-lived client-side reference.
    // Nothing is sent to Saelis until the user chooses to begin.
    try {
      sessionStorage.setItem(
        "saelis-reflect-memory",
        JSON.stringify({ title: memoryLabel(memory) }),
      );
    } catch {
      // Session storage unavailable — the user can still start manually.
    }
    router.push("/conversation");
  }

  async function handleCreateNorthStar() {
    const content = northStarDraft.trim();
    if (!content) return;
    const result = await createAction({
      kind: "north-star",
      title: null,
      content,
      reason: "A direction you chose to keep in view.",
    });
    if (result.ok) {
      setCreating(false);
      setNorthStarDraft("");
      setNotice("Kept. You can edit or remove it any time.");
      router.refresh();
    } else {
      setNotice(result.error);
    }
  }

  if (memories.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <EmptyState
          visual={<TheLight state="reflecting" size={80} />}
          title="Your sky is still open."
          body="Memories you choose to keep will appear here — each one placed among the stars, each one yours to revisit or release."
          action={
            <Button variant="soft" onClick={() => setCreating(true)}>
              Add a North Star
            </Button>
          }
        />
        {renderCreateDialog()}
        {notice ? <InlineNotice tone="info">{notice}</InlineNotice> : null}
      </div>
    );
  }

  function renderCreateDialog() {
    return (
      <Dialog open={creating} onClose={() => setCreating(false)} title="Add a North Star">
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            void handleCreateNorthStar();
          }}
        >
          <label htmlFor="north-star-content" className="text-sm text-ink-soft">
            What helps you remember the direction you want to move in?
          </label>
          <textarea
            id="north-star-content"
            value={northStarDraft}
            onChange={(event) => setNorthStarDraft(event.target.value)}
            maxLength={1000}
            rows={3}
            className="glass-surface rounded-2xl px-3 py-2 text-ink"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setCreating(false)}>
              Not now
            </Button>
            <Button type="submit" disabled={northStarDraft.trim().length === 0}>
              Keep this
            </Button>
          </div>
        </form>
      </Dialog>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="View" className="flex gap-2">
          <Button
            variant={view === "sky" ? "primary" : "soft"}
            aria-pressed={view === "sky"}
            onClick={() => setView("sky")}
          >
            Sky
          </Button>
          <Button
            variant={view === "list" ? "primary" : "soft"}
            aria-pressed={view === "list"}
            onClick={() => setView("list")}
          >
            List
          </Button>
        </div>
        <Button variant="soft" onClick={() => setCreating(true)}>
          Add a North Star
        </Button>
      </div>

      {notice ? <InlineNotice tone="info">{notice}</InlineNotice> : null}

      {view === "sky" ? (
        <div
          className="constellation-panel glass-surface relative overflow-hidden"
          style={{ minHeight: "24rem" }}
        >
          {/* Decorative backdrop stars — never interactive. */}
          <div aria-hidden="true">
            {availableStars
              .filter((star) => !usedPositions.has(`${star.x}:${star.y}`))
              .map((star) => (
                <span
                  key={star.id}
                  className="constellation-backdrop-star"
                  style={{
                    left: `${star.x}%`,
                    top: `${star.y}%`,
                    opacity: star.opacity * 0.4,
                  }}
                />
              ))}
          </div>
          {memoryStars.map((star) => (
            <button
              key={star.memoryId}
              type="button"
              className={`memory-star ${star.kind === "north-star" ? "memory-star--north" : ""}`}
              style={{ left: `${star.x}%`, top: `${star.y}%` }}
              aria-label={`${star.kind === "north-star" ? "North Star" : "Constellation"}: ${star.label}`}
              onClick={() => setSelectedId(star.memoryId)}
            />
          ))}
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {memories.map((memory) => (
            <li key={memory.id}>
              <button
                type="button"
                onClick={() => setSelectedId(memory.id)}
                className="glass-surface flex min-h-11 w-full items-center justify-between gap-3 px-4 py-3 text-left"
              >
                <span className="text-ink">{memoryLabel(memory)}</span>
                <span className="text-xs uppercase tracking-wide text-ink-muted">
                  {memory.kind === "north-star" ? "✦ North Star" : "· Constellation"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {northStars.length > 0 ? (
        <section aria-labelledby="north-stars-heading" className="glass-surface p-5">
          <h2 id="north-stars-heading" className="mb-2 font-semibold text-ink">
            ✦ North Stars
          </h2>
          <ul className="flex flex-col gap-1">
            {northStars.slice(0, 5).map((memory) => (
              <li key={memory.id} className="text-ink-soft">
                {memory.content}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <Dialog
        open={selected !== null}
        onClose={() => setSelectedId(null)}
        title={selected ? memoryLabel(selected) : "Memory"}
      >
        {selected ? (
          <div className="flex flex-col gap-3">
            <p className="text-xs uppercase tracking-wide text-ink-muted">
              {selected.kind === "north-star" ? "✦ North Star" : "· Constellation"}
            </p>
            <p className="text-ink">{selected.content}</p>
            {selected.reason ? (
              <p className="text-sm text-ink-soft">Why it may help: {selected.reason}</p>
            ) : null}
            <p className="text-xs text-ink-muted">Saved {formatDate(selected.createdAt)}</p>
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="soft" onClick={() => handleReflect(selected)}>
                Reflect with Saelis
              </Button>
              <a
                href="/settings/memories"
                className="inline-flex min-h-11 items-center rounded-full px-4 text-sm text-ink-soft hover:bg-cloud-lilac/60"
              >
                Edit
              </a>
              <Button variant="danger" onClick={() => void handleDelete(selected.id)}>
                Remove
              </Button>
            </div>
          </div>
        ) : null}
      </Dialog>

      {renderCreateDialog()}
    </div>
  );
}
