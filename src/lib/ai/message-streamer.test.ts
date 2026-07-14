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
});
