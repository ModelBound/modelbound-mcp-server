/**
 * MCP tools: eval.* — eval case CRUD, run scoring, results history.
 *
 * Thin wrappers around hosted create_eval_case, list_eval_cases, run_eval,
 * list_eval_results for Test & Optimize parity with the Skill Editor.
 */
import type { CloudClient } from "../proxy.js";

const requireCloud = (client: CloudClient | null): CloudClient => {
  if (!client) throw new Error("eval.* tools require MODELBOUND_API_KEY.");
  return client;
};

export function evalTools(client: CloudClient | null) {
  return [
    {
      name: "eval.createCase",
      description:
        "Create a new eval test case (name, input_prompt, optional expected_output, rubric). Requires agent scope.",
      inputSchema: {
        type: "object",
        properties: {
          name: { type: "string" },
          input_prompt: { type: "string" },
          description: { type: "string" },
          expected_output: { type: "string" },
          rubric: { type: "string" },
          agent_id: { type: "string" },
        },
        required: ["name", "input_prompt"],
      },
      handler: async (args: Record<string, unknown>) =>
        requireCloud(client).callTool("create_eval_case", args),
    },
    {
      name: "eval.listCases",
      description: "List all eval cases for the team. Requires agent scope.",
      inputSchema: { type: "object", properties: {} },
      handler: async (args: Record<string, unknown>) =>
        requireCloud(client).callTool("list_eval_cases", args),
    },
    {
      name: "eval.run",
      description:
        "Submit actual output for scoring against an eval case. Pass score/pass for manual judging or omit for AI judge.",
      inputSchema: {
        type: "object",
        properties: {
          eval_case_id: { type: "string" },
          actual_output: { type: "string" },
          score: { type: "number", description: "0-100" },
          pass: { type: "boolean" },
          judge_type: { type: "string", enum: ["manual", "ai", "automated"] },
        },
        required: ["eval_case_id", "actual_output"],
      },
      handler: async (args: Record<string, unknown>) =>
        requireCloud(client).callTool("run_eval", args),
    },
    {
      name: "eval.listResults",
      description: "List past eval results, optionally filtered by eval_case_id.",
      inputSchema: {
        type: "object",
        properties: {
          eval_case_id: { type: "string" },
          limit: { type: "number", default: 50 },
        },
      },
      handler: async (args: Record<string, unknown>) =>
        requireCloud(client).callTool("list_eval_results", args),
    },
  ];
}
