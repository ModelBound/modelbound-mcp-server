import { CloudClient } from "../proxy.js";

const requireCloud = (client: CloudClient | null): CloudClient => {
  if (!client) {
    throw new Error(
      "This tool requires MODELBOUND_API_KEY. Get one at https://modelbound.co/settings/api-keys",
    );
  }
  return client;
};

export function cloudTools(client: CloudClient | null) {
  return [
    {
      name: "cloud.pullSkill",
      description: "Pull a skill from the ModelBound cloud library. Response includes ai_type, source_platform, source_path, and repo when known. Requires MODELBOUND_API_KEY.",
      inputSchema: {
        type: "object",
        properties: { slug: { type: "string" } },
        required: ["slug"],
      },
      handler: async (args: { slug: string }) =>
        requireCloud(client).callTool("get_skill", { skill_id: args.slug, file_id: args.slug }),
    },
    {
      name: "cloud.pushSkill",
      description: "Create or update a skill in the cloud library. Requires MODELBOUND_API_KEY.",
      inputSchema: {
        type: "object",
        properties: {
          slug: { type: "string" },
          title: { type: "string" },
          body_md: { type: "string" },
        },
        required: ["slug", "body_md"],
      },
      handler: async (args: Record<string, unknown>) =>
        requireCloud(client).callTool("files.sync", args),
    },
    {
      name: "cloud.listSkills",
      description:
        "List skills in the cloud library. Supports ai_type (skill|hook|steering|system-prompt|rule|agent|memory|spec|instructions|prompt) and source_platform (claude-code|cursor|kiro|amazon-q|copilot|windsurf|codex|agents|modelbound) filters. Each row includes ai_type, source_platform, source_path, and repo for hierarchy-aware orchestration. Requires MODELBOUND_API_KEY.",
      inputSchema: {
        type: "object",
        properties: {
          ai_type: {
            type: "string",
            description: "Filter by AI file type (e.g. 'skill', 'hook', 'rule', 'system-prompt').",
          },
          source_platform: {
            type: "string",
            description: "Filter by source platform (e.g. 'claude-code', 'cursor', 'kiro').",
          },
        },
      },
      handler: async (args: { ai_type?: string; source_platform?: string }) =>
        requireCloud(client).callTool("list_skills", {
          ...(args.ai_type ? { ai_type: args.ai_type } : {}),
          ...(args.source_platform ? { source_platform: args.source_platform } : {}),
        }),
    },
    {
      name: "cloud.resourceTree",
      description:
        "Return the team's full AI resource hierarchy grouped by platform → top-level directory (.claude/skills, .cursor/rules, .kiro/steering, …) → files. Use this BEFORE listSkills when an orchestrator needs to map available context before loading. Requires MODELBOUND_API_KEY.",
      inputSchema: {
        type: "object",
        properties: {
          platform: {
            type: "string",
            description: "Optional: restrict to a single source platform (e.g. 'claude-code').",
          },
          repo: {
            type: "string",
            description: "Optional: restrict to a single repo (e.g. 'org/name').",
          },
        },
      },
      handler: async (args: { platform?: string; repo?: string }) =>
        requireCloud(client).callTool("get_resource_tree", {
          ...(args.platform ? { platform: args.platform } : {}),
          ...(args.repo ? { repo: args.repo } : {}),
        }),
    },
    {
      name: "cloud.search",
      description: "Full-text search across all cloud content. Requires MODELBOUND_API_KEY.",
      inputSchema: {
        type: "object",
        properties: { q: { type: "string" } },
        required: ["q"],
      },
      handler: async (args: { q: string }) =>
        requireCloud(client).callTool("search.all", { query: args.q }),
    },
    {
      name: "cloud.installMarketplaceSkill",
      description: "Install a public marketplace skill into your library. Requires MODELBOUND_API_KEY.",
      inputSchema: {
        type: "object",
        properties: { slug: { type: "string" } },
        required: ["slug"],
      },
      handler: async (args: { slug: string }) =>
        requireCloud(client).callTool("skills.install", { slug: args.slug }),
    },
    {
      name: "optimization.health",
      description: "Get token health scores and staleness for your context library. Requires MODELBOUND_API_KEY.",
      inputSchema: { type: "object", properties: {} },
      handler: async () => requireCloud(client).callTool("optimization.health", {}),
    },
  ];
}
