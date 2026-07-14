/**
 * Typed provider errors and their calm public messages.
 * Raw SDK errors, HTTP bodies, and stack traces never reach the client.
 */

export type ProviderErrorCode =
  | "provider-not-configured"
  | "provider-authentication"
  | "provider-rate-limit"
  | "provider-timeout"
  | "provider-unavailable"
  | "provider-validation"
  | "provider-aborted"
  | "provider-unknown";

export class ProviderError extends Error {
  readonly code: ProviderErrorCode;
  readonly retryable: boolean;
  readonly publicMessage: string;
  /** Suggested wait before retry, when the provider supplied one. */
  readonly retryAfterMs?: number;

  constructor(
    code: ProviderErrorCode,
    publicMessage: string,
    options: { retryable?: boolean; retryAfterMs?: number; message?: string } = {},
  ) {
    super(options.message ?? code);
    this.name = "ProviderError";
    this.code = code;
    this.publicMessage = publicMessage;
    this.retryable = options.retryable ?? false;
    this.retryAfterMs = options.retryAfterMs;
  }
}

export class ProviderNotConfiguredError extends ProviderError {
  constructor(detail?: string) {
    super("provider-not-configured", "Saelis is not fully connected yet.", { message: detail });
  }
}

export class ProviderAuthenticationError extends ProviderError {
  constructor() {
    super("provider-authentication", "Saelis is not fully connected yet.");
  }
}

export class ProviderRateLimitError extends ProviderError {
  constructor(retryAfterMs?: number) {
    super("provider-rate-limit", "Saelis needs a brief pause before responding again.", {
      retryable: true,
      retryAfterMs,
    });
  }
}

export class ProviderTimeoutError extends ProviderError {
  constructor() {
    super(
      "provider-timeout",
      "The moment went quiet before I could finish. Your words are still here.",
      { retryable: true },
    );
  }
}

export class ProviderUnavailableError extends ProviderError {
  constructor() {
    super(
      "provider-unavailable",
      "I couldn't meet you clearly in that moment. Please try once more.",
      {
        retryable: true,
      },
    );
  }
}

export class ProviderValidationError extends ProviderError {
  constructor() {
    super(
      "provider-validation",
      "I couldn't meet you clearly in that moment. Please try once more.",
    );
  }
}

export class ProviderAbortedError extends ProviderError {
  constructor() {
    // Abort is not alarming — the UI simply returns to a ready state.
    super("provider-aborted", "");
  }
}

export class ProviderUnknownError extends ProviderError {
  constructor() {
    super("provider-unknown", "I couldn't meet you clearly in that moment. Please try once more.");
  }
}

/** Duck-typed classification of OpenAI SDK / fetch failures. Never rethrows raw errors. */
export function classifyProviderError(error: unknown): ProviderError {
  if (error instanceof ProviderError) return error;

  const err = error as {
    name?: string;
    status?: number;
    code?: string;
    headers?: { get?: (key: string) => string | null } | Record<string, string>;
  };

  if (err?.name === "AbortError" || err?.name === "APIUserAbortError") {
    return new ProviderAbortedError();
  }
  if (err?.name === "TimeoutError") {
    return new ProviderTimeoutError();
  }

  const status = typeof err?.status === "number" ? err.status : undefined;
  if (status === 401 || status === 403) return new ProviderAuthenticationError();
  if (status === 429) {
    let retryAfterMs: number | undefined;
    const headers = err.headers;
    const raw =
      headers && typeof (headers as { get?: unknown }).get === "function"
        ? (headers as { get: (key: string) => string | null }).get("retry-after")
        : ((headers as Record<string, string> | undefined)?.["retry-after"] ?? null);
    if (raw) {
      const seconds = Number(raw);
      if (Number.isFinite(seconds)) retryAfterMs = seconds * 1000;
    }
    return new ProviderRateLimitError(retryAfterMs);
  }
  if (status === 408) return new ProviderTimeoutError();
  if (status !== undefined && status >= 500) return new ProviderUnavailableError();
  if (status !== undefined && status >= 400) {
    return new ProviderError(
      "provider-validation",
      "I couldn't meet you clearly in that moment. Please try once more.",
    );
  }
  if (err?.name === "APIConnectionError" || err?.name === "APIConnectionTimeoutError") {
    return new ProviderUnavailableError();
  }

  return new ProviderUnknownError();
}
