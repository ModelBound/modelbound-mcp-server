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
      name: "pull_skill",
      description: "Pull a skill from the ModelBound cloud library. Requires MODELBOUND_API_KEY.",
      inputSchema: {
        type: "object",
        properties: { slug: { type: "string" } },
        required: ["slug"],
      },
      handler: async (args: { slug: string }) =>
        requireCloud(client).callTool("get_skill", { slug: args.slug }),
    },
    {
      name: "push_skill",
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
        requireCloud(client).callTool("sync_file", args),
    },
    {
      name: "list_cloud_skills",
      description: "List skills in the cloud library. Requires MODELBOUND_API_KEY.",
      inputSchema: { type: "object", properties: {} },
      handler: async () => requireCloud(client).callTool("list_skills", {}),
    },
    {
      name: "search_cloud",
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
      name: "install_marketplace_skill",
      description: "Install a public marketplace skill into your library. Requires MODELBOUND_API_KEY.",
      inputSchema: {
        type: "object",
        properties: { slug: { type: "string" } },
        required: ["slug"],
      },
      handler: async (args: { slug: string }) =>
        requireCloud(client).callTool("install_skill", { slug: args.slug }),
    },
    {
      name: "get_context_health",
      description: "Get token health scores and staleness for your context library. Requires MODELBOUND_API_KEY.",
      inputSchema: { type: "object", properties: {} },
      handler: async () => requireCloud(client).callTool("get_context_health", {}),
    },
  ];
}
