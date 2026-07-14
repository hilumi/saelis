/**
 * Types for the (future) import of local single-file-prototype data.
 * The prototype stored everything in localStorage under `saelis_*` keys.
 * Nothing is uploaded automatically — see src/lib/prototype-import.ts.
 */

export type PrototypeDataKind =
  "arrivals" | "conversations" | "horizon-steps" | "memories" | "preferences" | "unknown";

/** One detected localStorage key with a safe summary of its contents. */
export interface PrototypeDetectionEntry {
  key: string;
  kind: PrototypeDataKind;
  /** Number of records if the value parsed as an array, 1 for an object, 0 otherwise. */
  recordCount: number;
  /** False when the stored value was malformed JSON (it will be skipped on import). */
  parsed: boolean;
}

export interface PrototypeDetectionResult {
  found: boolean;
  entries: PrototypeDetectionEntry[];
}

/** Selection the user confirms before any import runs. */
export interface PrototypeImportSelection {
  keys: string[];
  confirmed: boolean;
}
