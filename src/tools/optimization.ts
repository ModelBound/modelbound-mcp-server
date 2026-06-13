import { CloudClient } from "../proxy.js";

const requireCloud = (client: CloudClient | null): CloudClient => {
  if (!client) {
    throw new Error(
      "This tool requires MODELBOUND_API_KEY. Get one at https://modelbound.co/settings/api-keys",
    );
  }
  return client;
};

/**
 * Token optimization + Skill Development Pipeline tools.
 *
 * These tools let any MCP client (Cursor, Claude Code, Windsurf, custom
 * agents, the new modelbound-cli) run the same optimization, pipeline,
 * test, benchmark, and version operations that are available in the
 * ModelBound web UI — without ever opening the web UI.
 *
 * All tools are cloud-backed and require MODELBOUND_API_KEY.
 */
export function optimizationTools(client: CloudClient | null) {
  return [
    // ---- Token Optimization ----
    {
      name: "optimization.run",
      description:
        "Run token optimization on a skill or context file. Returns a diff of suggested edits with per-section token deltas. Use `apply: true` to write the optimized version back to the cloud library (creates a new version automatically). Requires MODELBOUND_API_KEY.",
      inputSchema: {
        type: "object",
        properties: {
          file_id: { type: "string", description: "Cloud file ID (skill, system prompt, rule, etc.)." },
          slug: { type: "string", description: "Alternative to file_id — the file slug." },
          strategy: {
            type: "string",
            enum: ["balanced", "aggressive", "structure-only"],
            description: "Optimization aggressiveness. Default: balanced.",
          },
          apply: {
            type: "boolean",
            description: "If true, save the optimized version. If false (default), return the diff only.",
          },
        },
      },
      handler: async (args: Record<string, unknown>) =>
        requireCloud(client).callTool("optimization.run", args),
    },
    {
      name: "optimization.suggestions",
      description:
        "Get pending optimization suggestions for a file (or all files if file_id omitted). Returns suggestion IDs you can later apply with `optimization.apply`. Requires MODELBOUND_API_KEY.",
      inputSchema: {
        type: "object",
        properties: {
          file_id: { type: "string" },
          severity: { type: "string", enum: ["info", "warning", "high"] },
        },
      },
      handler: async (args: Record<string, unknown>) =>
        requireCloud(client).callTool("optimization.suggestions", args),
    },
    {
      name: "optimization.apply",
      description:
        "Apply one or more optimization suggestions by ID. Creates a new version of each affected file. Requires MODELBOUND_API_KEY.",
      inputSchema: {
        type: "object",
        properties: {
          suggestion_ids: { type: "array", items: { type: "string" }, minItems: 1 },
        },
        required: ["suggestion_ids"],
      },
      handler: async (args: Record<string, unknown>) =>
        requireCloud(client).callTool("optimization.apply", args),
    },

    // ---- Skill Development Pipeline ----
    {
      name: "pipeline.run",
      description:
        "Run the full Skill Development Pipeline (lint → trust score → test suite → benchmark → optimization suggestions) on a skill. Returns a pipeline_run_id you can poll with `pipeline.status`. Requires MODELBOUND_API_KEY.",
      inputSchema: {
        type: "object",
        properties: {
          file_id: { type: "string" },
          slug: { type: "string" },
          phases: {
            type: "array",
            items: { type: "string", enum: ["lint", "trust", "test", "benchmark", "optimize"] },
            description: "Optional subset of phases. Default: all.",
          },
        },
      },
      handler: async (args: Record<string, unknown>) =>
        requireCloud(client).callTool("pipeline.run", args),
    },
    {
      name: "pipeline.status",
      description:
        "Get the status and results of a pipeline run. Returns per-phase status, findings, trust score, test pass rate, and optimization suggestions. Requires MODELBOUND_API_KEY.",
      inputSchema: {
        type: "object",
        properties: { pipeline_run_id: { type: "string" } },
        required: ["pipeline_run_id"],
      },
      handler: async (args: Record<string, unknown>) =>
        requireCloud(client).callTool("pipeline.status", args),
    },

    // ---- Test & Benchmark ----
    {
      name: "skill.test",
      description:
        "Run the test suite (assertions + simulations) for a skill against the current version or a specific version_id. Returns pass/fail per assertion plus token/cost telemetry. Requires MODELBOUND_API_KEY.",
      inputSchema: {
        type: "object",
        properties: {
          file_id: { type: "string" },
          slug: { type: "string" },
          version_id: { type: "string", description: "Optional: test a specific version." },
          model: { type: "string", description: "Optional: model to evaluate against (e.g. 'gpt-4o', 'claude-3.5-sonnet')." },
        },
      },
      handler: async (args: Record<string, unknown>) =>
        requireCloud(client).callTool("skill.test", args),
    },
    {
      name: "skill.benchmark",
      description:
        "Benchmark two versions of a skill (or skill vs baseline) head-to-head: token count, cost per call, pass rate, latency. Requires MODELBOUND_API_KEY.",
      inputSchema: {
        type: "object",
        properties: {
          file_id: { type: "string" },
          version_a: { type: "string", description: "Version ID (or 'current')." },
          version_b: { type: "string", description: "Version ID (or 'baseline')." },
        },
        required: ["file_id"],
      },
      handler: async (args: Record<string, unknown>) =>
        requireCloud(client).callTool("skill.benchmark", args),
    },

    // ---- Versions / Restore / Diff ----
    {
      name: "skill.versions",
      description:
        "List all versions of a skill or context file, newest first. Includes version_id, created_at, author, token_count, and change summary. Requires MODELBOUND_API_KEY.",
      inputSchema: {
        type: "object",
        properties: {
          file_id: { type: "string" },
          slug: { type: "string" },
          limit: { type: "number", default: 20 },
        },
      },
      handler: async (args: Record<string, unknown>) =>
        requireCloud(client).callTool("skill.versions", args),
    },
    {
      name: "skill.restore",
      description:
        "Restore a skill to a previous version. Creates a new version on top of history (does not destroy newer versions). Requires MODELBOUND_API_KEY.",
      inputSchema: {
        type: "object",
        properties: {
          file_id: { type: "string" },
          version_id: { type: "string" },
        },
        required: ["file_id", "version_id"],
      },
      handler: async (args: Record<string, unknown>) =>
        requireCloud(client).callTool("skill.restore", args),
    },
    {
      name: "skill.diff",
      description:
        "Return a unified diff between two versions of a skill (or between a version and the current draft). Requires MODELBOUND_API_KEY.",
      inputSchema: {
        type: "object",
        properties: {
          file_id: { type: "string" },
          from: { type: "string", description: "Version ID, 'baseline', or 'previous'." },
          to: { type: "string", description: "Version ID or 'current'. Default: 'current'." },
        },
        required: ["file_id", "from"],
      },
      handler: async (args: Record<string, unknown>) =>
        requireCloud(client).callTool("skill.diff", args),
    },
  ];
}
