/**
 * Typed progress events shared between MCP tools, the CLI, and IDE clients.
 * Renderers (TTY, NDJSON, MCP content) all consume this union so that the
 * user sees the same shape of summary regardless of where a command runs.
 */
export type ProgressEvent =
  | { type: "stage_started"; stage: string; at: string }
  | { type: "stage_progress"; stage: string; message: string; data?: Record<string, unknown> }
  | { type: "stage_done"; stage: string; status: "passed" | "failed" | "warn" | "skipped"; summary?: string; data?: Record<string, unknown> }
  | { type: "warn"; message: string; data?: Record<string, unknown> }
  | { type: "error"; message: string; data?: Record<string, unknown> }
  | { type: "summary"; title: string; lines: string[]; data?: Record<string, unknown> };

export function summarizePipeline(stages: Record<string, { status?: string; summary?: string }>): string[] {
  const order = ["edit", "test", "production"];
  return order
    .filter((k) => stages?.[k])
    .map((k) => {
      const s = stages[k];
      const icon = s.status === "passed" ? "✓" : s.status === "failed" ? "✗" : s.status === "running" ? "…" : "·";
      return `${icon} ${k}: ${s.summary ?? s.status ?? "—"}`;
    });
}
