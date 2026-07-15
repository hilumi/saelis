/**
 * Accessibility preference observation for the Living Sky.
 * Client-only helpers; safe no-ops on the server.
 */

export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
export const HIGH_CONTRAST_QUERY = "(prefers-contrast: more)";

export function currentMediaPreference(query: string): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia(query).matches;
}

/** Subscribe to a media preference; returns an unsubscribe function. */
export function observeMediaPreference(
  query: string,
  onChange: (matches: boolean) => void,
): () => void {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return () => {};
  }
  const media = window.matchMedia(query);
  const listener = (event: MediaQueryListEvent) => onChange(event.matches);
  media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
}
