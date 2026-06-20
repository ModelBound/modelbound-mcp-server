/**
 * MCP tools: optimization.*
 *
 * Thin wrappers over the hosted ModelBound MCP server's `optimize_tokens` /
 * `get_optimized_context` tools. We keep all heavy logic server-side and
 * surface a clean, dot-notation API to IDE agents.
 *
 * Safety: optimize.run defaults to dry_run=false but the calling client (CLI
 * / IDE extension) is responsible for creating a local backup via
 * src/core/backup.ts BEFORE invoking this tool on a file from disk. Skill /
 * pack / agent targets in the cloud are versioned server-side automatically
 * (file_versions table) so server-side backups are guaranteed regardless.
 */
import type { CloudClient } from "../proxy.js";

const requireCloud = (client: CloudClient | null): CloudClient => {
  if (!client) {
    throw new Error(
      "optimization.* tools require MODELBOUND_API_KEY. Get one at https://modelbound.co/settings/api-keys",
    );
  }
  return client;
};

type OptimizeArgs = {
  skill_id?: string;
  file_id?: string;
  agent_id?: string;
  pack_id?: string;
  intensity?: "conservative" | "balanced" | "aggressive";
  dry_run?: boolean;
};

export function optimizationTools(client: CloudClient | null) {
  return [
    {
      name: "optimization.run",
      description:
        "Run AI token optimization on a cloud skill, file, agent, or pack. Returns tokens_saved, savings_pct, version snapshot id, and a per-file breakdown. Requires MODELBOUND_API_KEY. Server creates a backup version automatically; for local-file edits the caller MUST snapshot via the BackupEngine first.",
      inputSchema: {
        type: "object",
        properties: {
          skill_id: { type: "string" },
          file_id: { type: "string" },
          agent_id: { type: "string" },
          pack_id: { type: "string" },
          intensity: { type: "string", enum: ["conservative", "balanced", "aggressive"], default: "balanced" },
          dry_run: { type: "boolean", default: false, description: "Project savings without writing." },
        },
      },
      handler: async (args: OptimizeArgs) =>
        requireCloud(client).callTool("optimize_tokens", {
          skill_id: args.skill_id,
          file_id: args.file_id,
          pack_id: args.pack_id,
          intensity: args.intensity,
          dry_run: args.dry_run ?? false,
        }),
    },
    {
      name: "optimization.dryRun",
      description:
        "Same as optimization.run but never writes. Returns projected savings. Safe to call from auto-suggest hooks. Requires MODELBOUND_API_KEY.",
      inputSchema: {
        type: "object",
        properties: {
          skill_id: { type: "string" },
          file_id: { type: "string" },
          agent_id: { type: "string" },
          pack_id: { type: "string" },
          intensity: { type: "string", enum: ["conservative", "balanced", "aggressive"], default: "balanced" },
        },
      },
      handler: async (args: OptimizeArgs) =>
        requireCloud(client).callTool("optimize_tokens", {
          skill_id: args.skill_id,
          file_id: args.file_id,
          pack_id: args.pack_id,
          intensity: args.intensity,
          dry_run: true,
        }),
    },
    {
      name: "optimization.preview",
      description:
        "Fetch a cached optimized variant of a skill or file without re-running optimization. Useful when an agent wants the lean version for inference but the raw version for editing.",
      inputSchema: {
        type: "object",
        properties: {
          skill_id: { type: "string" },
          file_id: { type: "string" },
        },
      },
      handler: async (args: { skill_id?: string; file_id?: string }) =>
        requireCloud(client).callTool("get_optimized_context", args),
    },
  ];
}
