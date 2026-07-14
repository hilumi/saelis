/**
 * Privacy-conscious technical telemetry.
 *
 * NEVER logged: user messages, assistant messages, memory content, profile
 * details, provider payloads, API keys, cookies, tokens, hidden reasoning.
 * This console-based logger is a development stand-in; the abstraction lets
 * production move to a managed service without touching call sites.
 */

export interface CompanionTelemetryEvent {
  requestId: string;
  /** Non-reversible reference for correlation — never the raw user id in prod logs. */
  userRef: string;
  provider: string;
  model?: string;
  latencyMs?: number;
  outcome: "success" | "error" | "aborted" | "urgent-bypass" | "rate-limited";
  errorCode?: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  supportMode?: string;
  safetyLevel?: string;
  retryCount?: number;
}

/** Small stable hash (djb2, hex). Correlation-only — not cryptographic. */
export function hashUserRef(userId: string): string {
  let hash = 5381;
  for (let index = 0; index < userId.length; index += 1) {
    hash = (hash * 33) ^ userId.charCodeAt(index);
  }
  return (hash >>> 0).toString(16);
}

export function logCompanionEvent(event: CompanionTelemetryEvent): void {
  if (process.env.NODE_ENV === "test") return;
  // Structured, single-line, content-free.
  console.info("[companion]", JSON.stringify(event));
}
