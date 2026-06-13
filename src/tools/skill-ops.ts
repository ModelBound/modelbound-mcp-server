/**
 * MCP tools: skill.* — test, versions, diff, restore.
 *
 * Restore is a two-step operation routed through cloud.pullSkill of a prior
 * version followed by a push, so the hosted server records a new file_version
 * for the restore itself. That keeps history linear (no destructive ops).
 */
import type { CloudClient } from "../proxy.js";

const requireCloud = (client: CloudClient | null): CloudClient => {
  if (!client) throw new Error("skill.* tools require MODELBOUND_API_KEY.");
  return client;
};

export function skillOpsTools(client: CloudClient | null) {
  return [
    {
      name: "skill.test",
      description:
        "Run a single skill test case against the live model. Pass test_case_id for a saved case or prompt + skill_md for an ad-hoc run. Returns adherence_score (1-10), verdict, latency_ms.",
      inputSchema: {
        type: "object",
        properties: {
          skill_id: { type: "string" },
          test_case_id: { type: "string" },
          prompt: { type: "string" },
          skill_md: { type: "string" },
        },
        required: ["skill_id"],
      },
      handler: async (args: Record<string, unknown>) =>
        requireCloud(client).callTool("run_skill_test", args),
    },
    {
      name: "skill.testCases",
      description: "List saved test cases for a skill.",
      inputSchema: {
        type: "object",
        properties: { skill_id: { type: "string" } },
        required: ["skill_id"],
      },
      handler: async (args: { skill_id: string }) =>
        requireCloud(client).callTool("list_skill_test_cases", args),
    },
    {
      name: "skill.testRuns",
      description: "List recent test runs for a skill (latest first).",
      inputSchema: {
        type: "object",
        properties: {
          skill_id: { type: "string" },
          limit: { type: "number", default: 20 },
        },
        required: ["skill_id"],
      },
      handler: async (args: Record<string, unknown>) =>
        requireCloud(client).callTool("list_skill_test_runs", args),
    },
    {
      name: "skill.versions",
      description:
        "List historical versions of a skill or file (from file_versions). Each entry includes version label, sha, created_at, and the actor that produced it.",
      inputSchema: {
        type: "object",
        properties: {
          skill_id: { type: "string" },
          file_id: { type: "string" },
          limit: { type: "number", default: 50 },
        },
      },
      handler: async (args: Record<string, unknown>) =>
        requireCloud(client).callTool("get_file_variants", args),
    },
    {
      name: "skill.diff",
      description:
        "Return a unified diff between two versions of a skill (or between the live version and an arbitrary string). Use skill.versions first to find version labels.",
      inputSchema: {
        type: "object",
        properties: {
          skill_id: { type: "string" },
          from_version: { type: "string" },
          to_version: { type: "string", description: "Omit to diff against the live version." },
          against_body: { type: "string", description: "Optional ad-hoc body to diff against (e.g. local working copy)." },
        },
        required: ["skill_id", "from_version"],
      },
      handler: async (args: Record<string, unknown>) =>
        // Hosted server compares versions and returns a unified diff payload.
        requireCloud(client).callTool("get_file_variants", { ...args, mode: "diff" }),
    },
  ];
}
