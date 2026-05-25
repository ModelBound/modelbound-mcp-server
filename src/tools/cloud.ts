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
      description: "Pull a skill from the ModelBound cloud library. Requires MODELBOUND_API_KEY.",
      inputSchema: {
        type: "object",
        properties: { slug: { type: "string" } },
        required: ["slug"],
      },
      handler: async (args: { slug: string }) =>
        requireCloud(client).callTool("skills.get", { slug: args.slug }),
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
      description: "List skills in the cloud library. Requires MODELBOUND_API_KEY.",
      inputSchema: { type: "object", properties: {} },
      handler: async () => requireCloud(client).callTool("skills.list", {}),
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
