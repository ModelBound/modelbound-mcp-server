/**
 * MCP tools: pipeline.*
 *
 * Wraps the hosted run_skill_pipeline + get_skill_pipeline_status tools so
 * agents can run the full Test → Optimize → Production pipeline on a skill
 * and poll progress without leaving their IDE.
 *
 * The hosted server enforces all gates (trust score, latency, saved test
 * cases) and creates file_versions snapshots before any production write.
 * `override_gates=true` is forwarded as-is — callers are responsible for
 * surfacing that override clearly in their UI.
 */
import type { CloudClient } from "../proxy.js";

const requireCloud = (client: CloudClient | null): CloudClient => {
  if (!client) {
    throw new Error("pipeline.* tools require MODELBOUND_API_KEY.");
  }
  return client;
};

export function pipelineTools(client: CloudClient | null) {
  return [
    {
      name: "pipeline.run",
      description:
        "Run the Skill Development Pipeline (Test → Optimize → Production) on a skill. Streams stage results into skill_pipeline_runs. Returns { run_id, status, version_after }. Use pipeline.status to watch progress. Requires MODELBOUND_API_KEY.",
      inputSchema: {
        type: "object",
        properties: {
          skill_id: { type: "string" },
          targets: {
            type: "array",
            items: { type: "string" },
            description: "e.g. ['marketplace', 'claude']. Production stage publishes to each target after gates pass.",
          },
          version_bump: { type: "string", enum: ["patch", "minor", "major", "none"], default: "patch" },
          stage: {
            type: "string",
            enum: ["full", "test_optimize", "production"],
            default: "full",
            description: "Pipeline stage to run.",
          },
          override_gates: {
            type: "boolean",
            default: false,
            description: "Bypass trust/latency/test gates. Surface this prominently in any UI.",
          },
          apply_optimization: {
            type: "boolean",
            default: false,
            description: "If true, apply the optimization in the Test stage; otherwise dry-run only.",
          },
          changelog: { type: "string" },
        },
        required: ["skill_id"],
      },
      handler: async (args: Record<string, unknown>) =>
        requireCloud(client).callTool("run_skill_pipeline", args),
    },
    {
      name: "pipeline.status",
      description:
        "Get pipeline run status. Pass run_id for a specific run, or skill_id + limit for recent runs. Poll every 1-2s while status === 'running'.",
      inputSchema: {
        type: "object",
        properties: {
          run_id: { type: "string" },
          skill_id: { type: "string" },
          limit: { type: "number", default: 1 },
        },
      },
      handler: async (args: Record<string, unknown>) =>
        requireCloud(client).callTool("get_skill_pipeline_status", args),
    },
    {
      name: "pipeline.config",
      description:
        "Read or update a skill's pipeline_config (min_trust, max_latency_ms, enforce_* flags, default targets). Pass `config` to update; omit to read.",
      inputSchema: {
        type: "object",
        properties: {
          skill_id: { type: "string" },
          config: {
            type: "object",
            description: "Partial pipeline config to merge. Omit to read current config.",
          },
        },
        required: ["skill_id"],
      },
      handler: async (args: Record<string, unknown>) =>
        requireCloud(client).callTool("set_skill_pipeline_config", args),
    },
  ];
}
