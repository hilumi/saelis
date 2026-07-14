import type {
  PrototypeDataKind,
  PrototypeDetectionEntry,
  PrototypeDetectionResult,
} from "@/types/prototype";

/**
 * Detection utilities for data saved by the local single-file prototype.
 *
 * IMPORTANT: nothing here uploads anything. Phase 1 ships detection and
 * preview only. A future import screen must (1) show the user exactly what
 * was found, (2) let them select what to import, (3) require explicit
 * confirmation, (4) map records into the database schema transactionally,
 * (5) skip malformed records safely, and (6) avoid duplicate imports
 * (e.g. by recording imported prototype record ids).
 */

export const PROTOTYPE_KEY_PREFIX = "saelis_";

export const KNOWN_PROTOTYPE_KEYS: Record<string, PrototypeDataKind> = {
  saelis_arrivals: "arrivals",
  saelis_conversations: "conversations",
  saelis_horizon_steps: "horizon-steps",
  saelis_memories: "memories",
  saelis_preferences: "preferences",
};

/** Minimal Storage surface so the utility is testable without a real browser. */
export interface StorageLike {
  readonly length: number;
  key(index: number): string | null;
  getItem(key: string): string | null;
}

export function classifyPrototypeKey(key: string): PrototypeDataKind {
  return KNOWN_PROTOTYPE_KEYS[key] ?? "unknown";
}

/**
 * Scan a Storage object for prototype data. Read-only and side-effect free.
 * Malformed JSON is reported (parsed: false) and will be skipped by import.
 */
export function detectPrototypeData(storage: StorageLike): PrototypeDetectionResult {
  const entries: PrototypeDetectionEntry[] = [];

  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (!key || !key.startsWith(PROTOTYPE_KEY_PREFIX)) continue;

    const raw = storage.getItem(key);
    let parsed = false;
    let recordCount = 0;

    if (raw !== null) {
      try {
        const value: unknown = JSON.parse(raw);
        parsed = true;
        if (Array.isArray(value)) {
          recordCount = value.length;
        } else if (value !== null && typeof value === "object") {
          recordCount = 1;
        }
      } catch {
        parsed = false;
      }
    }

    entries.push({ key, kind: classifyPrototypeKey(key), recordCount, parsed });
  }

  return { found: entries.length > 0, entries };
}
