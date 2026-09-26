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
 * Skill feedback loop.
 *
 * A skill is scored before it is ever used. These tools capture the other half:
 * what actually happened when an agent used it, so the skill can be corrected.
 *
 * Call skill.report_outcome once the task that used a skill is finished.
 */
export function outcomesTools(client: CloudClient | null) {
  return [
    {
      name: "skill.report_outcome",
      description:
        "Report how a skill performed after you used it. Call this once the task that used the skill is finished — it is how the skill gets improved. Keep excerpts short. Requires MODELBOUND_API_KEY.",
      inputSchema: {
        type: "object",
        properties: {
          skill_id: { type: "string", description: "The Skill UUID you loaded." },
          verdict: { type: "string", enum: ["worked", "partial", "failed"] },
          category: {
            type: "string",
            enum: [
              "ignored_rule",
              "out_of_scope",
              "wrong_tool",
              "hallucinated",
              "wrong_format",
              "too_vague",
              "other",
            ],
            description: "Only when the verdict is not 'worked'.",
          },
          note: { type: "string", description: "One sentence on what happened." },
          prompt_excerpt: { type: "string", description: "Optional short excerpt of the task prompt." },
          output_excerpt: { type: "string", description: "Optional short excerpt of the bad output." },
        },
        required: ["skill_id", "verdict"],
      },
      handler: async (args: Record<string, unknown>) =>
        requireCloud(client).callTool("report_skill_outcome", args),
    },
    {
      name: "skill.reliability",
      description:
        "Read back how the team's skills have performed in real use (worked / partial / failed over a rolling window). Use it to pick the most reliable skill for a task, or to find the ones that need attention. Requires MODELBOUND_API_KEY.",
      inputSchema: {
        type: "object",
        properties: {
          days: { type: "number", description: "Rolling window in days. Default 30." },
          skill_id: { type: "string", description: "Optional: limit to one Skill UUID." },
        },
      },
      handler: async (args: Record<string, unknown>) =>
        requireCloud(client).callTool("get_skill_reliability", args),
    },
  ];
}
