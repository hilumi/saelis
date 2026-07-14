/** Join class names, skipping falsy values. */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

/** Clamp a number into an inclusive range. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Truncate text to a maximum length, appending an ellipsis when cut. */
export function truncate(text: string, maxLength: number): string {
  if (maxLength <= 1 || text.length <= maxLength) {
    return text.length <= maxLength ? text : text.slice(0, Math.max(0, maxLength));
  }
  return `${text.slice(0, maxLength - 1).trimEnd()}…`;
}

/** True when the value is a non-empty, non-whitespace string. */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
