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
        requireCloud(client).callTool("get_skill", { skill_id: args.slug }),
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
      handler: async (args: { slug: string; title?: string; body_md: string }) => {
        const cloud = requireCloud(client);
        const sourcePath = args.slug.includes("/") ? args.slug : `.modelbound/${args.slug}.md`;
        return cloud.callTool("sync_skill_from_ide", {
          source_ide: "modelbound",
          source_path: sourcePath,
          name: args.title ?? args.slug,
          body_md: args.body_md,
        });
      },
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
          // Hosted API accepts `platform`; also send source_platform for forward-compat.
          ...(args.platform ? { platform: args.platform, source_platform: args.platform } : {}),
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
        requireCloud(client).callTool("search_all", { query: args.q }),
    },
    {
      name: "cloud.installMarketplaceSkill",
      description: "Install a public marketplace skill into your library. Requires MODELBOUND_API_KEY.",
      inputSchema: {
        type: "object",
        properties: { slug: { type: "string" } },
        required: ["slug"],
      },
      handler: async (args: { slug: string }) => {
        const cloud = requireCloud(client);
        const published = (await cloud.callTool("get_published_skill", { slug: args.slug })) as {
          skill?: { name: string; description: string; body_md: string };
        };
        const skill = published?.skill;
        if (!skill?.body_md) {
          throw new Error(`Published skill not found: ${args.slug}`);
        }
        return cloud.callTool("create_skill", {
          name: skill.name,
          description: skill.description,
          body_md: skill.body_md,
        });
      },
    },
    {
      name: "optimization.health",
      description: "Get token health scores and staleness for your context library. Requires MODELBOUND_API_KEY.",
      inputSchema: { type: "object", properties: {} },
      handler: async () => requireCloud(client).callTool("get_context_health", {}),
    },
  ];
}
