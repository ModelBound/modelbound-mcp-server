/**
 * Thin JSON-RPC 2.0 client for the hosted ModelBound MCP server.
 *
 * The URL is hardcoded on purpose: users shouldn't point this at arbitrary
 * servers from inside their IDE. To self-host, fork this file.
 */
const MCP_URL = "https://mcp.modelbound.co/mcp?source=oss-mcp";

let nextId = 1;

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
    if (!res.ok) {
      throw new Error(`ModelBound cloud returned ${res.status}: ${await res.text()}`);
    }
    const body = (await res.json()) as { result?: unknown; error?: { message: string } };
    if (body.error) throw new Error(body.error.message);
    return body.result;
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    return this.call("tools/call", { name, arguments: args });
  }
}
