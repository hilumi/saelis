/**
 * Incremental Server-Sent-Events decoder. Pure and buffer-safe: chunks may
 * split events anywhere (including mid-line); events are emitted only when
 * their terminating blank line has arrived. No library dependencies.
 */

export interface RawSseEvent {
  event: string;
  data: string;
}

export interface SseDecoder {
  /** Feed a decoded text chunk; returns any events completed by it. */
  push(chunk: string): RawSseEvent[];
  /** Flush a final, unterminated event (used when the stream ends). */
  end(): RawSseEvent[];
}

export function createSseDecoder(): SseDecoder {
  let buffer = "";

  function parseBlock(block: string): RawSseEvent | null {
    let event = "message";
    const dataLines: string[] = [];
    for (const rawLine of block.split("\n")) {
      const line = rawLine.endsWith("\r") ? rawLine.slice(0, -1) : rawLine;
      if (line.startsWith("event:")) {
        event = line.slice(6).trimStart();
      } else if (line.startsWith("data:")) {
        dataLines.push(line.slice(5).trimStart());
      }
      // Comments (":...") and other fields are ignored, per the SSE spec.
    }
    if (dataLines.length === 0) return null;
    return { event, data: dataLines.join("\n") };
  }

  return {
    push(chunk: string): RawSseEvent[] {
      buffer += chunk;
      const events: RawSseEvent[] = [];
      // An event ends at a blank line: \n\n (or \r\n\r\n).
      let boundary = findBoundary(buffer);
      while (boundary) {
        const block = buffer.slice(0, boundary.index);
        buffer = buffer.slice(boundary.index + boundary.length);
        const parsed = parseBlock(block);
        if (parsed) events.push(parsed);
        boundary = findBoundary(buffer);
      }
      return events;
    },
    end(): RawSseEvent[] {
      const remaining = buffer;
      buffer = "";
      if (remaining.trim().length === 0) return [];
      const parsed = parseBlock(remaining);
      return parsed ? [parsed] : [];
    },
  };
}

function findBoundary(text: string): { index: number; length: number } | null {
  const lf = text.indexOf("\n\n");
  const crlf = text.indexOf("\r\n\r\n");
  if (lf === -1 && crlf === -1) return null;
  if (crlf !== -1 && (lf === -1 || crlf < lf)) return { index: crlf, length: 4 };
  return { index: lf, length: 2 };
}
