/**
 * Incremental extraction of the `message` string field from a streaming
 * structured-output JSON response.
 *
 * The Responses API streams the structured JSON as text deltas. We never show
 * raw partial JSON to the user; instead this small state machine emits only
 * the decoded contents of the `"message"` field as it arrives. The complete
 * JSON is still assembled and Zod-validated server-side before anything is
 * treated as final application state.
 */
export class MessageFieldStreamer {
  private state: "searching" | "streaming" | "done" = "searching";
  private searchBuffer = "";
  private escapeBuffer = ""; // holds a partial escape sequence across chunks

  /** Feed a raw JSON text delta; returns the user-visible text it contained. */
  push(delta: string): string {
    if (this.state === "done") return "";

    if (this.state === "searching") {
      this.searchBuffer += delta;
      const match = /"message"\s*:\s*"/.exec(this.searchBuffer);
      if (!match) {
        // Bound memory; the prefix before "message" is small by schema order.
        if (this.searchBuffer.length > 4096) {
          this.searchBuffer = this.searchBuffer.slice(-64);
        }
        return "";
      }
      const rest = this.searchBuffer.slice(match.index + match[0].length);
      this.searchBuffer = "";
      this.state = "streaming";
      return this.consume(rest);
    }

    return this.consume(delta);
  }

  get finished(): boolean {
    return this.state === "done";
  }

  private consume(text: string): string {
    let out = "";
    const input = this.escapeBuffer + text;
    this.escapeBuffer = "";

    let index = 0;
    while (index < input.length) {
      const char = input[index] as string;

      if (char === "\\") {
        const escape = input.slice(index, index + 2);
        if (escape.length < 2) {
          this.escapeBuffer = escape;
          break;
        }
        const code = escape[1];
        if (code === "u") {
          const unicode = input.slice(index, index + 6);
          if (unicode.length < 6) {
            this.escapeBuffer = unicode;
            break;
          }
          const codePoint = Number.parseInt(unicode.slice(2), 16);
          out += Number.isFinite(codePoint) ? String.fromCharCode(codePoint) : "";
          index += 6;
          continue;
        }
        const simple: Record<string, string> = {
          n: "\n",
          t: "\t",
          r: "\r",
          '"': '"',
          "\\": "\\",
          "/": "/",
          b: "",
          f: "",
        };
        out += simple[code as string] ?? "";
        index += 2;
        continue;
      }

      if (char === '"') {
        this.state = "done";
        break;
      }

      out += char;
      index += 1;
    }

    return out;
  }
}
