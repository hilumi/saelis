"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineNotice } from "@/components/ui/inline-notice";
import { TheLight } from "@/components/brand/the-light";
import { formatDate } from "@/lib/dates";

import type { ActionResult } from "@/types/actions";
import type { MemoryKind } from "@/types/companion";

export interface MemoryCardData {
  id: string;
  kind: MemoryKind;
  title: string | null;
  content: string;
  reason: string | null;
  createdAt: string;
  updatedAt: string;
  active: boolean;
}

type ExportResult =
  | { ok: true; exportedAt: string; memories: Array<Record<string, string | null>> }
  | { ok: false; error: string };

export interface MemoryCenterProps {
  memories: MemoryCardData[];
  updateAction: (input: unknown) => Promise<ActionResult>;
  deleteAction: (input: unknown) => Promise<ActionResult>;
  clearAllAction: () => Promise<ActionResult>;
  exportAction: () => Promise<ExportResult>;
}

const KIND_LABEL: Record<MemoryKind, string> = {
  constellation: "Constellation",
  "north-star": "North Star",
};

type Filter = "all" | MemoryKind;
type Sort = "updated" | "created" | "alphabetical";

/** "How Saelis remembers" — every memory exists because the user chose it. */
export function MemoryCenter({
  memories: initialMemories,
  updateAction,
  deleteAction,
  clearAllAction,
  exportAction,
}: MemoryCenterProps) {
  const [memories, setMemories] = useState(initialMemories);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("updated");
  const [editing, setEditing] = useState<MemoryCardData | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<MemoryCardData | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = memories.filter((memory) => {
      if (filter !== "all" && memory.kind !== filter) return false;
      if (!query) return true;
      return (
        memory.content.toLowerCase().includes(query) ||
        (memory.title ?? "").toLowerCase().includes(query) ||
        (memory.reason ?? "").toLowerCase().includes(query)
      );
    });
    return [...filtered].sort((a, b) => {
      if (sort === "alphabetical") {
        return (a.title ?? a.content).localeCompare(b.title ?? b.content);
      }
      const key = sort === "updated" ? "updatedAt" : "createdAt";
      return b[key].localeCompare(a[key]);
    });
  }, [memories, search, filter, sort]);

  async function handleSaveEdit(form: MemoryCardData) {
    const result = await updateAction({
      memoryId: form.id,
      kind: form.kind,
      title: form.title,
      content: form.content,
      reason: form.reason,
    });
    if (result.ok) {
      setMemories((current) =>
        current.map((memory) =>
          memory.id === form.id ? { ...form, updatedAt: new Date().toISOString() } : memory,
        ),
      );
      setEditing(null);
      setNotice({ tone: "success", text: "Kept, with your changes." });
    } else {
      setNotice({ tone: "error", text: result.error });
    }
  }

  async function handleDelete(memory: MemoryCardData) {
    const result = await deleteAction({ memoryId: memory.id });
    setConfirmDelete(null);
    if (result.ok) {
      setMemories((current) => current.filter((item) => item.id !== memory.id));
      setNotice({ tone: "success", text: "Removed. Saelis will no longer use it." });
    } else {
      setNotice({ tone: "error", text: result.error });
    }
  }

  async function handleClearAll() {
    const result = await clearAllAction();
    setConfirmClear(false);
    if (result.ok) {
      setMemories([]);
      setNotice({ tone: "success", text: "All memories cleared." });
    } else {
      setNotice({ tone: "error", text: result.error });
    }
  }

  async function handleExport() {
    const result = await exportAction();
    if (!result.ok) {
      setNotice({ tone: "error", text: result.error });
      return;
    }
    const date = result.exportedAt.slice(0, 10);
    const blob = new Blob(
      [JSON.stringify({ exportedAt: result.exportedAt, memories: result.memories }, null, 2)],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `saelis-memories-${date}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  if (memories.length === 0) {
    return (
      <EmptyState
        visual={<TheLight state="reflecting" size={80} />}
        title="Nothing is remembered yet."
        body="When you approve a memory — or create one — it appears here, fully yours to edit, export, or remove."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-ink-soft">
        Memories are stored in your Saelis account and used only in your own conversations. Keep
        only what still feels useful.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="memory-search" className="sr-only">
          Search memories
        </label>
        <input
          id="memory-search"
          type="search"
          placeholder="Search…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="glass-surface min-h-11 flex-1 rounded-2xl px-4 py-2 text-ink"
        />
        <label htmlFor="memory-sort" className="sr-only">
          Sort memories
        </label>
        <select
          id="memory-sort"
          value={sort}
          onChange={(event) => setSort(event.target.value as Sort)}
          className="glass-surface min-h-11 rounded-2xl px-3 text-ink"
        >
          <option value="updated">Recently updated</option>
          <option value="created">Recently created</option>
          <option value="alphabetical">Alphabetical</option>
        </select>
      </div>

      <div role="group" aria-label="Filter memories" className="flex gap-2">
        {(
          [
            ["all", "All"],
            ["constellation", "Constellations"],
            ["north-star", "North Stars"],
          ] as const
        ).map(([value, label]) => (
          <Button
            key={value}
            variant={filter === value ? "primary" : "soft"}
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
          >
            {label}
          </Button>
        ))}
      </div>

      {notice ? <InlineNotice tone={notice.tone}>{notice.text}</InlineNotice> : null}

      <ul className="flex flex-col gap-3">
        {visible.map((memory) => (
          <li key={memory.id} className="glass-surface flex flex-col gap-2 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
                  {memory.kind === "north-star" ? "✦ " : "· "}
                  {KIND_LABEL[memory.kind]}
                  {memory.active ? "" : " (not in use)"}
                </p>
                {memory.title ? <h3 className="font-semibold text-ink">{memory.title}</h3> : null}
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setEditing({ ...memory })}>
                  Edit
                </Button>
                <Button variant="danger" onClick={() => setConfirmDelete(memory)}>
                  Remove
                </Button>
              </div>
            </div>
            <p className="text-ink">{memory.content}</p>
            {memory.reason ? (
              <p className="text-sm text-ink-soft">Why it may help: {memory.reason}</p>
            ) : null}
            <p className="text-xs text-ink-muted">
              Saved {formatDate(memory.createdAt)} · Updated {formatDate(memory.updatedAt)}
            </p>
          </li>
        ))}
        {visible.length === 0 ? (
          <li className="py-6 text-center text-ink-soft">Nothing matches that search.</li>
        ) : null}
      </ul>

      <div className="flex flex-wrap gap-3">
        <Button variant="soft" onClick={() => void handleExport()}>
          Export memories (JSON)
        </Button>
        <Button variant="danger" onClick={() => setConfirmClear(true)}>
          Clear all memories
        </Button>
      </div>

      <Dialog open={editing !== null} onClose={() => setEditing(null)} title="Edit memory">
        {editing ? (
          <form
            className="flex flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              void handleSaveEdit(editing);
            }}
          >
            <label className="text-sm font-medium text-ink" htmlFor="edit-title">
              Title (optional)
            </label>
            <input
              id="edit-title"
              value={editing.title ?? ""}
              maxLength={120}
              onChange={(event) => setEditing({ ...editing, title: event.target.value || null })}
              className="glass-surface min-h-11 rounded-2xl px-3 text-ink"
            />
            <label className="text-sm font-medium text-ink" htmlFor="edit-content">
              Memory
            </label>
            <textarea
              id="edit-content"
              value={editing.content}
              maxLength={1000}
              rows={3}
              onChange={(event) => setEditing({ ...editing, content: event.target.value })}
              className="glass-surface rounded-2xl px-3 py-2 text-ink"
            />
            <label className="text-sm font-medium text-ink" htmlFor="edit-reason">
              Why it may help (optional)
            </label>
            <input
              id="edit-reason"
              value={editing.reason ?? ""}
              maxLength={1000}
              onChange={(event) => setEditing({ ...editing, reason: event.target.value || null })}
              className="glass-surface min-h-11 rounded-2xl px-3 text-ink"
            />
            <label className="text-sm font-medium text-ink" htmlFor="edit-kind">
              Kind
            </label>
            <select
              id="edit-kind"
              value={editing.kind}
              onChange={(event) =>
                setEditing({ ...editing, kind: event.target.value as MemoryKind })
              }
              className="glass-surface min-h-11 rounded-2xl px-3 text-ink"
            >
              <option value="constellation">Constellation</option>
              <option value="north-star">North Star</option>
            </select>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button type="submit">Keep changes</Button>
            </div>
          </form>
        ) : null}
      </Dialog>

      <Dialog
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        title="Remove this memory?"
      >
        <p className="mb-4 text-ink-soft">
          This will stop Saelis from using it in future conversations.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmDelete(null)}>
            Keep it
          </Button>
          <Button
            variant="danger"
            onClick={() => confirmDelete && void handleDelete(confirmDelete)}
          >
            Remove
          </Button>
        </div>
      </Dialog>

      <Dialog
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        title="Clear every saved memory?"
      >
        <p className="mb-4 text-ink-soft">
          This cannot be undone. Saelis will continue to support you without retained memories.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmClear(false)}>
            Keep them
          </Button>
          <Button variant="danger" onClick={() => void handleClearAll()}>
            Clear all
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
