import { describe, expect, it, vi } from "vitest";
import type { CompanionStreamEvent } from "@saelis/shared";

import { ApiRequestError, createApiClient } from "./client";
import type { FetchLike, FetchResponseLike } from "./client";

const encoder = new TextEncoder();

/** Build a streaming SSE response from raw frames. */
function sseResponse(frames: string[], status = 200): FetchResponseLike {
  let index = 0;
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => null },
    body: {
      getReader: () => ({
        async read() {
          if (index >= frames.length) return { done: true as const };
          const value = encoder.encode(frames[index]);
          index += 1;
          return { done: false as const, value };
        },
        cancel: () => undefined,
      }),
    },
    text: async () => frames.join(""),
  };
}

function jsonErrorResponse(status: number, body: unknown, retryAfter?: string): FetchResponseLike {
  return {
    ok: false,
    status,
    headers: { get: (name) => (name === "Retry-After" && retryAfter ? retryAfter : null) },
    body: null,
    text: async () => JSON.stringify(body),
  };
}

function makeDeps(
  fetchFn: FetchLike,
  tokens: { current?: string | null; refreshed?: string | null } = {},
) {
  const getAccessToken = vi.fn(async () => tokens.current ?? "token-1");
  const refreshAccessToken = vi.fn(async () => tokens.refreshed ?? null);
  return {
    deps: { baseUrl: "https://api.example.com/", fetchFn, getAccessToken, refreshAccessToken },
    getAccessToken,
    refreshAccessToken,
  };
}

function collectEvents() {
  const events: CompanionStreamEvent[] = [];
  return { events, onEvent: (event: CompanionStreamEvent) => events.push(event) };
}

describe("createApiClient — bearer token attachment", () => {
  it("attaches the current access token and posts JSON to the base URL", async () => {
    const fetchFn = vi.fn(async () => sseResponse(['event: start\ndata: {"requestId":"r"}\n\n']));
    const { deps } = makeDeps(fetchFn);
    const { onEvent } = collectEvents();

    await createApiClient(deps).postStream("/api/companion/stream", { message: "hi" }, { onEvent });

    expect(fetchFn).toHaveBeenCalledTimes(1);
    const [url, init] = fetchFn.mock.calls[0] as unknown as Parameters<FetchLike>;
    expect(url).toBe("https://api.example.com/api/companion/stream");
    expect(init.headers.Authorization).toBe("Bearer token-1");
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(JSON.parse(init.body as string)).toEqual({ message: "hi" });
  });

  it("refreshes once on 401 and retries with the new token", async () => {
    const fetchFn = vi
      .fn<FetchLike>()
      .mockResolvedValueOnce(jsonErrorResponse(401, { error: "Please sign in." }))
      .mockResolvedValueOnce(sseResponse(['event: start\ndata: {"requestId":"r"}\n\n']));
    const { deps, refreshAccessToken } = makeDeps(fetchFn, { refreshed: "token-2" });
    const { events, onEvent } = collectEvents();

    await createApiClient(deps).postStream("/x", {}, { onEvent });

    expect(refreshAccessToken).toHaveBeenCalledTimes(1);
    const secondInit = (fetchFn.mock.calls[1] as Parameters<FetchLike>)[1];
    expect(secondInit.headers.Authorization).toBe("Bearer token-2");
    expect(events).toHaveLength(1);
  });

  it("surfaces the structured 401 error when refresh fails", async () => {
    const fetchFn = vi.fn(async () =>
      jsonErrorResponse(401, { error: "Please sign in to talk with Saelis." }),
    );
    const { deps } = makeDeps(fetchFn, { refreshed: null });

    await expect(
      createApiClient(deps).postStream("/x", {}, { onEvent: () => undefined }),
    ).rejects.toMatchObject({ status: 401, message: "Please sign in to talk with Saelis." });
  });
});

describe("createApiClient — stream parsing", () => {
  it("delivers typed events in order across chunk boundaries", async () => {
    const frames = [
      'event: start\ndata: {"requestId":"r1"}\n\nevent: del',
      'ta\ndata: {"text":"Hel"}\n\nevent: delta\ndata: {"te',
      'xt":"lo"}\n\nevent: complete\ndata: {"conversationId":"c1","response":{"message":"Hello"}}\n\n',
    ];
    const fetchFn = vi.fn(async () => sseResponse(frames));
    const { deps } = makeDeps(fetchFn);
    const { events, onEvent } = collectEvents();

    await createApiClient(deps).postStream("/x", {}, { onEvent });

    expect(events.map((event) => event.type)).toEqual(["start", "delta", "delta", "complete"]);
    const complete = events[3];
    if (complete?.type !== "complete") throw new Error("expected complete");
    expect(complete.data.conversationId).toBe("c1");
    expect(complete.data.response.message).toBe("Hello");
  });

  it("skips malformed payloads without crashing the stream", async () => {
    const fetchFn = vi.fn(async () =>
      sseResponse([
        "event: delta\ndata: not-json\n\n",
        'event: mystery\ndata: {"x":1}\n\n',
        'event: delta\ndata: {"text":"ok"}\n\n',
      ]),
    );
    const { deps } = makeDeps(fetchFn);
    const { events, onEvent } = collectEvents();

    await createApiClient(deps).postStream("/x", {}, { onEvent });

    expect(events).toHaveLength(1);
    expect(events[0]?.type).toBe("delta");
  });

  it("parses structured API errors with Retry-After", async () => {
    const fetchFn = vi.fn(async () =>
      jsonErrorResponse(429, { error: "Saelis needs a brief pause." }, "17"),
    );
    const { deps } = makeDeps(fetchFn);

    const promise = createApiClient(deps).postStream("/x", {}, { onEvent: () => undefined });
    await expect(promise).rejects.toBeInstanceOf(ApiRequestError);
    await promise.catch((error: ApiRequestError) => {
      expect(error.status).toBe(429);
      expect(error.message).toBe("Saelis needs a brief pause.");
      expect(error.retryAfterSeconds).toBe(17);
      expect(error.retryable).toBe(true);
    });
  });
});

describe("createApiClient — cancellation and timeouts", () => {
  it("propagates user cancellation as AbortError", async () => {
    const external = new AbortController();
    const fetchFn: FetchLike = async (_url, init) => ({
      ok: true,
      status: 200,
      headers: { get: () => null },
      body: {
        getReader: () => ({
          read: () =>
            new Promise<{ done: boolean; value?: Uint8Array }>((_resolve, reject) => {
              if (init.signal?.aborted) {
                reject(new Error("aborted"));
                return;
              }
              init.signal?.addEventListener("abort", () => reject(new Error("aborted")));
            }),
          cancel: () => undefined,
        }),
      },
      text: async () => "",
    });
    const { deps } = makeDeps(fetchFn);

    const promise = createApiClient(deps).postStream(
      "/x",
      {},
      { onEvent: () => undefined, signal: external.signal },
    );
    external.abort();
    await expect(promise).rejects.toMatchObject({ name: "AbortError" });
  });

  it("fails with a calm timeout error when no bytes arrive in time", async () => {
    vi.useFakeTimers();
    try {
      const fetchFn: FetchLike = (_url, init) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener("abort", () => reject(new Error("aborted")));
        });
      const { deps } = makeDeps(fetchFn);

      const promise = createApiClient(deps)
        .postStream("/x", {}, { onEvent: () => undefined, connectTimeoutMs: 1000 })
        .catch((error: unknown) => error);
      await vi.advanceTimersByTimeAsync(1100);
      const error = await promise;
      expect(error).toBeInstanceOf(ApiRequestError);
      expect((error as ApiRequestError).message).toMatch(/longer than usual/);
      expect((error as ApiRequestError).retryable).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});
