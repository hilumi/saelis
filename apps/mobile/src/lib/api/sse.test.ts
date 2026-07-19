import { describe, expect, it } from "vitest";

import { createSseDecoder } from "./sse";

describe("createSseDecoder", () => {
  it("parses a complete event", () => {
    const decoder = createSseDecoder();
    const events = decoder.push('event: delta\ndata: {"text":"hello"}\n\n');
    expect(events).toEqual([{ event: "delta", data: '{"text":"hello"}' }]);
  });

  it("handles events split across arbitrary chunk boundaries", () => {
    const decoder = createSseDecoder();
    const full = 'event: delta\ndata: {"text":"helélo"}\n\nevent: complete\ndata: {"ok":1}\n\n';
    for (let split = 1; split < full.length - 1; split++) {
      const fresh = createSseDecoder();
      const events = [...fresh.push(full.slice(0, split)), ...fresh.push(full.slice(split))];
      expect(events).toEqual([
        { event: "delta", data: '{"text":"helélo"}' },
        { event: "complete", data: '{"ok":1}' },
      ]);
    }
    expect(decoder.push(full)).toHaveLength(2);
  });

  it("parses multiple events in one chunk and preserves order", () => {
    const decoder = createSseDecoder();
    const events = decoder.push(
      'event: start\ndata: {"requestId":"r1"}\n\nevent: delta\ndata: {"text":"a"}\n\nevent: delta\ndata: {"text":"b"}\n\n',
    );
    expect(events.map((event) => event.event)).toEqual(["start", "delta", "delta"]);
  });

  it("supports CRLF line endings", () => {
    const decoder = createSseDecoder();
    const events = decoder.push('event: delta\r\ndata: {"text":"x"}\r\n\r\n');
    expect(events).toEqual([{ event: "delta", data: '{"text":"x"}' }]);
  });

  it("joins multi-line data per the SSE spec", () => {
    const decoder = createSseDecoder();
    const events = decoder.push("event: delta\ndata: line1\ndata: line2\n\n");
    expect(events[0]?.data).toBe("line1\nline2");
  });

  it("ignores comments and unknown fields", () => {
    const decoder = createSseDecoder();
    const events = decoder.push(': keep-alive\n\nevent: delta\nid: 7\ndata: {"text":"y"}\n\n');
    expect(events).toEqual([{ event: "delta", data: '{"text":"y"}' }]);
  });

  it("flushes an unterminated final event on end()", () => {
    const decoder = createSseDecoder();
    expect(decoder.push('event: error\ndata: {"code":"x"}')).toEqual([]);
    expect(decoder.end()).toEqual([{ event: "error", data: '{"code":"x"}' }]);
  });
});
