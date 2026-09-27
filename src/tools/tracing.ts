/**
 * Skill-attributed tracing for the ModelBound MCP server.
 *
 * - report_run: agents self-report a finished run (always sends).
 * - traceWrap: when MODELBOUND_TRACING=1, records a summary span for each
 *   ModelBound tool call (name, duration, status). Never arguments or output.
 */
const ENDPOINT = process.env.MODELBOUND_TRACE_ENDPOINT ?? "https://api.modelbound.co/functions/v1/trace-ingest";
const MAX_STEPS = 200;

type Step = {
  name: string;
  kind?: "model" | "tool" | "retrieval" | "other";
  duration_ms?: number;
  input_tokens?: number;
  output_tokens?: number;
  status?: "ok" | "error";
  error_category?: string;
  skill_id?: string;
  skill_slug?: string;
  skill_version?: string;
  span_id?: string;
  parent_span_id?: string;
  started_at?: string;
};

async function send(payload: unknown): Promise<{ ok: boolean; status: number; body: unknown }> {
  const key = process.env.MODELBOUND_API_KEY;
  if (!key) return { ok: false, status: 0, body: "MODELBOUND_API_KEY is not set" };
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": key },
    body: JSON.stringify(payload),
  });
  let body: unknown = null;
  try { body = await res.json(); } catch { /* empty */ }
  return { ok: res.ok, status: res.status, body };
}

export function tracingTools() {
  return [
    {
      name: "report_run",
      description:
        "Report a finished agent run to ModelBound so each step is tied to the skill that shaped it. Send step summaries only (name, kind, duration, tokens, status) — never prompts or outputs. Failed runs become outcome reports for the skill.",
      inputSchema: {
        type: "object",
        properties: {
          run_id: { type: "string", description: "Your id for this run (re-sending the same id updates it)." },
          name: { type: "string", description: "Short run name, e.g. 'Deploy PR 42'." },
          skill_id: { type: "string", description: "Default skill UUID or slug for steps that don't set one." },
          steps: {
            type: "array",
            description: "Ordered steps of the run.",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                kind: { type: "string", enum: ["model", "tool", "retrieval", "other"] },
                duration_ms: { type: "number" },
                input_tokens: { type: "number" },
                output_tokens: { type: "number" },
                status: { type: "string", enum: ["ok", "error"] },
                error_category: { type: "string" },
                skill_id: { type: "string" },
                skill_version: { type: "string" },
                span_id: { type: "string", description: "Your id for this step, so child steps can point to it (multi-agent runs)." },
                parent_span_id: { type: "string", description: "span_id of the step/agent this step belongs to." },
                started_at: { type: "string", description: "ISO start time; lets parallel steps be timed correctly." },
              },
              required: ["name"],
            },
          },
        },
        required: ["steps"],
      },
      handler: async (args: { run_id?: string; name?: string; skill_id?: string; steps: Step[] }) => {
        const isUuid = (v?: string) => !!v && /^[0-9a-f-]{36}$/i.test(v);
        const steps = (args.steps ?? []).slice(0, MAX_STEPS).map((s) => {
          const ref = s.skill_id ?? args.skill_id;
          return {
            ...s,
            skill_id: isUuid(ref) ? ref : undefined,
            skill_slug: ref && !isUuid(ref) ? ref : undefined,
          };
        });
        const r = await send({
          runs: [{
            trace_id: args.run_id ?? `mcp-${Date.now()}`,
            name: args.name ?? "agent run",
            source: "modelbound-mcp",
            spans: steps,
          }],
        });
        if (!r.ok) return { recorded: false, status: r.status, error: r.body };
        return { recorded: true, steps: steps.length, result: r.body };
      },
    },
  ];
}

/** Wrap a tool so its call is recorded as a summary span (opt-in). */
export function traceWrap<T extends { name: string; handler: (args: any) => Promise<any> }>(tool: T): T {
  if (process.env.MODELBOUND_TRACING !== "1" || tool.name === "report_run") return tool;
  return {
    ...tool,
    handler: async (args: any) => {
      const started = Date.now();
      let status: "ok" | "error" = "ok";
      try {
        return await tool.handler(args);
      } catch (e) {
        status = "error";
        throw e;
      } finally {
        const ref = typeof args?.skill_id === "string" ? args.skill_id : undefined;
        const isUuid = !!ref && /^[0-9a-f-]{36}$/i.test(ref);
        void send({
          runs: [{
            trace_id: `mcp-${tool.name}-${started}`,
            name: tool.name,
            source: "modelbound-mcp",
            spans: [{
              name: tool.name,
              kind: "tool",
              duration_ms: Date.now() - started,
              status,
              skill_id: isUuid ? ref : undefined,
              skill_slug: ref && !isUuid ? ref : undefined,
            }],
          }],
        }).catch(() => {});
      }
    },
  };
}
