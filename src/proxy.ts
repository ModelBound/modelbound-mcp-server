/**
 * Thin JSON-RPC 2.0 client for the hosted ModelBound MCP server.
 *
 * The URL is hardcoded on purpose: users shouldn't point this at arbitrary
 * servers from inside their IDE. To self-host, fork this file.
 */
const MCP_URL = "https://mcp.modelbound.co/mcp?source=oss-mcp";

let nextId = 1;

type ToolCallResult = {
  content?: { type: string; text?: string }[];
  isError?: boolean;
};

/** Unwrap MCP tools/call results into plain JSON/string payloads. */
function unwrapToolResult(result: unknown): unknown {
  if (!result || typeof result !== "object" || !("content" in result)) return result;
  const r = result as ToolCallResult;
  if (!Array.isArray(r.content)) return result;
  if (r.isError) {
    const msg = r.content.map((c) => c.text ?? "").filter(Boolean).join("\n");
    throw new Error(msg || "ModelBound tool error");
  }
  const texts = r.content
    .filter((c) => c.type === "text" && c.text)
    .map((c) => c.text as string);
  if (texts.length === 0) return result;
  if (texts.length === 1) {
    try {
      return JSON.parse(texts[0]!);
    } catch {
      return texts[0];
    }
  }
  return texts.join("\n");
}

export class CloudClient {
  constructor(private apiKey: string) {}

  static fromEnv(): CloudClient | null {
    const key = process.env.MODELBOUND_API_KEY;
    return key ? new CloudClient(key) : null;
  }

  async call(method: string, params: unknown): Promise<unknown> {
    const res = await fetch(MCP_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // MCP Streamable HTTP servers reject without both Accept types.
        Accept: "application/json, text/event-stream",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: nextId++, method, params }),
    });
    const contentType = res.headers.get("content-type") ?? "";
    let raw = await res.text();
    if (contentType.includes("text/event-stream")) {
      const dataLines = raw
        .split("\n")
        .filter((l) => l.startsWith("data:"))
        .map((l) => l.slice(5).trim())
        .filter(Boolean);
      raw = dataLines[dataLines.length - 1] ?? "";
    }
    if (!res.ok) {
      throw new Error(`ModelBound cloud returned ${res.status}: ${raw}`);
    }
    let body: { result?: unknown; error?: { message: string } } = {};
    if (raw) {
      try {
        body = JSON.parse(raw) as typeof body;
      } catch {
        throw new Error(raw || "Empty MCP response");
      }
    }
    if (body.error) throw new Error(body.error.message);
    return body.result;
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    return unwrapToolResult(await this.call("tools/call", { name, arguments: args }));
  }
}
