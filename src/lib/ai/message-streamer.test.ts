import { describe, expect, it } from "vitest";

import { MessageFieldStreamer } from "@/lib/ai/message-streamer";

function streamAll(chunks: string[]): string {
  const streamer = new MessageFieldStreamer();
  return chunks.map((chunk) => streamer.push(chunk)).join("");
}

describe("MessageFieldStreamer", () => {
  it("extracts the message field from chunked JSON", () => {
    const text = streamAll([
      '{"supportMode":"witness","mess',
      'age":"Hello',
      ' there.","followUp":null}',
    ]);
    expect(text).toBe("Hello there.");
  });

  it("stops at the closing quote and ignores the rest", () => {
    const streamer = new MessageFieldStreamer();
    const out = streamer.push('{"message":"Done."} trailing "not this"');
    expect(out).toBe("Done.");
    expect(streamer.finished).toBe(true);
    expect(streamer.push('"more"')).toBe("");
  });

  it("decodes escape sequences, including across chunk boundaries", () => {
    const text = streamAll(['{"message":"Line one.\\', 'nLine two \\"quoted\\" end."']);
    expect(text).toBe('Line one.\nLine two "quoted" end.');
  });

  it("decodes unicode escapes split across chunks", () => {
    const text = streamAll(['{"message":"caf\\u00', 'e9 time"}']);
    expect(text).toBe("café time");
  });

  it("emits nothing before the message field appears", () => {
    const streamer = new MessageFieldStreamer();
    expect(streamer.push('{"supportMode":"comfort",')).toBe("");
    expect(streamer.push('"safetyNote":"not the field",')).toBe("");
    expect(streamer.push('"message":"Now."')).toBe("Now.");
  });

  it("v0.7 nested fields after message never leak into the visible stream", () => {
    const streamer = new MessageFieldStreamer();
    const parts = [
      '{"supportMode":"clarify","message":"Only this te',
      'xt is visible.","followUp":null,"reflection":{"facts":["The message says \\"we need to talk\\"."],',
      '"interpretations":["hidden"],"unknowns":[],"alternativePerspectives":[]},',
      '"insightCandidate":{"theme":"avoidance","observation":"hidden too","uncertaintyStatement":"maybe"}}',
    ];
    let visible = "";
    for (const part of parts) visible += streamer.push(part);
    expect(visible).toBe("Only this text is visible.");
    expect(streamer.finished).toBe(true);
  });
});
