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
 * The agent harness gate.
 *
 * Before an agent uses a skill unattended it should know whether the skill has
 * cleared the four harness pillars: context, permissions, guardrails, verification.
 * This reads the latest pipeline run — no model call, no extra cost.
 */
export function harnessTools(client: CloudClient | null) {
  return [
    {
      name: "check_harness",
      description:
        "Check whether a skill is cleared to run unattended. Returns a pass/warn/fail status across the four harness pillars (context, permissions, guardrails, verification) from the skill's latest pipeline run, with the reasons for anything blocking. Call this before using a skill for a task you will not review.",
      inputSchema: {
        type: "object",
        properties: {
          skill_id: { type: "string", description: "Skill UUID or slug." },
        },
        required: ["skill_id"],
      },
      handler: async (args: { skill_id: string }) => {
        const cloud = requireCloud(client);
        const run: any = await cloud.callTool("get_skill_pipeline_status", { skill_id: args.skill_id });
        const safety = run?.stage_results?.test?.details?.safety ?? null;
        if (!safety) {
          return {
            status: "unknown",
            ready: false,
            message:
              "No harness result yet. Run the skill pipeline (mb pipeline, or Test & Optimize in the app) to evaluate it.",
          };
        }
        return {
          status: safety.status,
          ready: safety.status === "pass",
          score: safety.score,
          summary: safety.summary,
          pillars: safety.pillars,
          blocking: (safety.checks ?? []).filter((c: { status: string }) => c.status === "fail"),
          cautions: (safety.checks ?? []).filter((c: { status: string }) => c.status === "warn"),
        };
      },
    },
  ];
}
