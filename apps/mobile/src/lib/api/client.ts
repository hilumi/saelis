import { parseApiError, parseStreamEvent } from "@saelis/shared";
import type { CompanionStreamEvent, ParsedApiError } from "@saelis/shared";

import { createSseDecoder } from "./sse";

/**
 * Typed Saelis API client (framework-free; fetch and token access are
 * injected so the whole client is unit-testable).
 *
 * - Attaches the current Supabase access token as a bearer header.
 * - On a 401, refreshes the token once and retries (before any bytes have
 *   been consumed), covering just-expired sessions.
 * - Streams SSE responses with cancellation (AbortSignal) and two timeouts:
 *   time-to-first-byte and idle-gap between chunks.
 * - Parses structured `{ error }` bodies into ApiRequestError.
 * - Carries no credentials of its own: never an OpenAI or service key.
 */

/** Minimal structural fetch types (satisfied by expo/fetch and node fetch). */
export interface FetchResponseLike {
  ok: boolean;
  status: number;
  headers: { get(name: string): string | null };
  body: {
    getReader(): {
      read(): Promise<{ done: boolean; value?: Uint8Array }>;
      cancel(): Promise<void> | void;
    };
  } | null;
  text(): Promise<string>;
}

export type FetchLike = (
  url: string,
  init: {
    method: string;
    headers: Record<string, string>;
    body?: string;
    signal?: AbortSignal;
  },
) => Promise<FetchResponseLike>;

export interface ApiClientDeps {
  baseUrl: string;
  fetchFn: FetchLike;
  /** Current access token, or null when signed out. */
  getAccessToken(): Promise<string | null>;
  /** Force-refresh; returns the new token or null. Called at most once per request. */
  refreshAccessToken(): Promise<string | null>;
}

export class ApiRequestError extends Error {
  readonly status: number;
  readonly retryAfterSeconds: number | null;
  /** True for failures worth retrying (network, 5xx, 429, timeouts). */
  readonly retryable: boolean;

  constructor(parsed: ParsedApiError, fallbackMessage: string) {
    super(parsed.message ?? fallbackMessage);
    this.name = "ApiRequestError";
    this.status = parsed.status;
    this.retryAfterSeconds = parsed.retryAfterSeconds;
    this.retryable = parsed.status === 429 || parsed.status >= 500 || parsed.status === 0;
  }
}

const NETWORK_MESSAGE = "We couldn’t reach Saelis just now. Please check your connection.";
const TIMEOUT_MESSAGE = "Saelis is taking longer than usual. Please try again.";

export interface StreamRequestOptions {
  /** External cancellation (user tapped stop, screen unmounted). */
  signal?: AbortSignal;
  onEvent(event: CompanionStreamEvent): void;
  /** Max wait for the response headers/first byte. Default 20s. */
  connectTimeoutMs?: number;
  /** Max quiet gap between streamed chunks. Default 45s. */
  idleTimeoutMs?: number;
}

export interface JsonRequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  timeoutMs?: number;
}

export interface ApiClient {
  /** POST a JSON body and stream typed SSE events until complete/error/abort. */
  postStream(path: string, body: unknown, options: StreamRequestOptions): Promise<void>;
  /** Plain JSON request with the same bearer/refresh/error handling. */
  requestJson<T = unknown>(path: string, options?: JsonRequestOptions): Promise<T>;
}

export function createApiClient(deps: ApiClientDeps): ApiClient {
  const baseUrl = deps.baseUrl.replace(/\/+$/, "");

  async function requestOnce(
    path: string,
    body: unknown,
    token: string | null,
    signal: AbortSignal,
  ): Promise<FetchResponseLike> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    return deps.fetchFn(`${baseUrl}${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal,
    });
  }

  async function jsonRequestOnce(
    path: string,
    options: JsonRequestOptions,
    token: string | null,
    signal: AbortSignal,
  ): Promise<FetchResponseLike> {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (options.body !== undefined) headers["Content-Type"] = "application/json";
    if (token) headers.Authorization = `Bearer ${token}`;
    return deps.fetchFn(`${baseUrl}${path}`, {
      method: options.method ?? "GET",
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal,
    });
  }

  return {
    async requestJson<T>(path: string, options: JsonRequestOptions = {}): Promise<T> {
      const abort = new AbortController();
      const timer = setTimeout(() => abort.abort(), options.timeoutMs ?? 15_000);
      try {
        let response: FetchResponseLike;
        try {
          response = await jsonRequestOnce(
            path,
            options,
            await deps.getAccessToken(),
            abort.signal,
          );
        } catch {
          throw new ApiRequestError(
            { status: 0, message: null, retryAfterSeconds: null },
            NETWORK_MESSAGE,
          );
        }

        if (response.status === 401) {
          const fresh = await deps.refreshAccessToken();
          if (fresh) {
            try {
              response = await jsonRequestOnce(path, options, fresh, abort.signal);
            } catch {
              throw new ApiRequestError(
                { status: 0, message: null, retryAfterSeconds: null },
                NETWORK_MESSAGE,
              );
            }
          }
        }

        const text = await response.text().catch(() => "");
        if (!response.ok) {
          throw new ApiRequestError(
            parseApiError(response.status, text, response.headers.get("Retry-After")),
            NETWORK_MESSAGE,
          );
        }
        try {
          return JSON.parse(text) as T;
        } catch {
          return undefined as T;
        }
      } finally {
        clearTimeout(timer);
      }
    },

    async postStream(path, body, options) {
      const abort = new AbortController();
      const onExternalAbort = () => abort.abort();
      if (options.signal) {
        if (options.signal.aborted) abort.abort();
        else options.signal.addEventListener("abort", onExternalAbort, { once: true });
      }

      const connectTimeoutMs = options.connectTimeoutMs ?? 20_000;
      const idleTimeoutMs = options.idleTimeoutMs ?? 45_000;
      let timer: ReturnType<typeof setTimeout> | null = null;
      let timedOut = false;
      const armTimer = (ms: number) => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          timedOut = true;
          abort.abort();
        }, ms);
      };

      try {
        armTimer(connectTimeoutMs);

        let response: FetchResponseLike;
        try {
          response = await requestOnce(path, body, await deps.getAccessToken(), abort.signal);
        } catch (error) {
          throw wrapTransportError(error, options.signal, timedOut);
        }

        // Just-expired session: refresh once and retry (no bytes consumed yet).
        if (response.status === 401) {
          const fresh = await deps.refreshAccessToken();
          if (fresh) {
            armTimer(connectTimeoutMs);
            try {
              response = await requestOnce(path, body, fresh, abort.signal);
            } catch (error) {
              throw wrapTransportError(error, options.signal, timedOut);
            }
          }
        }

        if (!response.ok) {
          const bodyText = await response.text().catch(() => "");
          throw new ApiRequestError(
            parseApiError(response.status, bodyText, response.headers.get("Retry-After")),
            NETWORK_MESSAGE,
          );
        }
        if (!response.body) {
          throw new ApiRequestError(
            { status: 0, message: null, retryAfterSeconds: null },
            NETWORK_MESSAGE,
          );
        }

        const reader = response.body.getReader();
        const decoder = createSseDecoder();
        const textDecoder = new TextDecoder();
        try {
          for (;;) {
            armTimer(idleTimeoutMs);
            const { done, value } = await reader.read();
            if (done) break;
            const events = decoder.push(textDecoder.decode(value, { stream: true }));
            for (const raw of events) {
              const event = parseStreamEvent(raw.event, raw.data);
              if (event) options.onEvent(event);
            }
          }
          for (const raw of decoder.end()) {
            const event = parseStreamEvent(raw.event, raw.data);
            if (event) options.onEvent(event);
          }
        } catch (error) {
          throw wrapTransportError(error, options.signal, timedOut);
        }
      } finally {
        if (timer) clearTimeout(timer);
        options.signal?.removeEventListener("abort", onExternalAbort);
      }
    },
  };
}

/** Distinguish user cancellation from timeouts and network failures. */
function wrapTransportError(
  error: unknown,
  externalSignal: AbortSignal | undefined,
  timedOut: boolean,
): Error {
  if (externalSignal?.aborted && !timedOut) {
    // User-initiated: propagate as a plain AbortError the caller recognizes.
    const abortError = new Error("Aborted");
    abortError.name = "AbortError";
    return abortError;
  }
  if (timedOut) {
    return new ApiRequestError(
      { status: 0, message: TIMEOUT_MESSAGE, retryAfterSeconds: null },
      TIMEOUT_MESSAGE,
    );
  }
  if (error instanceof ApiRequestError) return error;
  return new ApiRequestError(
    { status: 0, message: null, retryAfterSeconds: null },
    NETWORK_MESSAGE,
  );
}
