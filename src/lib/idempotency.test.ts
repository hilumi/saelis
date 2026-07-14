import { beforeEach, describe, expect, it } from "vitest";

import { beginGeneration, endGeneration, resetIdempotencyForTests } from "@/lib/idempotency";

beforeEach(() => resetIdempotencyForTests());

describe("idempotency guard", () => {
  it("allows a fresh request and rejects a duplicate in flight", () => {
    expect(beginGeneration("u1", "req-1")).toEqual({ ok: true });
    expect(beginGeneration("u1", "req-1")).toEqual({ ok: false, reason: "duplicate" });
  });

  it("allows only one active generation per user", () => {
    expect(beginGeneration("u1", "req-1")).toEqual({ ok: true });
    expect(beginGeneration("u1", "req-2")).toEqual({ ok: false, reason: "busy" });
    endGeneration("u1", "req-1");
    expect(beginGeneration("u1", "req-2")).toEqual({ ok: true });
  });

  it("rejects a recently completed request id (double-click protection)", () => {
    beginGeneration("u1", "req-1");
    endGeneration("u1", "req-1");
    expect(beginGeneration("u1", "req-1")).toEqual({ ok: false, reason: "duplicate" });
  });

  it("isolates users from each other", () => {
    expect(beginGeneration("u1", "req-1")).toEqual({ ok: true });
    expect(beginGeneration("u2", "req-1")).toEqual({ ok: true });
  });
});
