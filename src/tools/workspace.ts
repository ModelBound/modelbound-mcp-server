/**
 * MCP tools: workspace.* — session scoping for repo-aware skill ops.
 */
import type { CloudClient } from "../proxy.js";

const requireCloud = (client: CloudClient | null): CloudClient => {
  if (!client) throw new Error("workspace.* tools require MODELBOUND_API_KEY.");
  return client;
};

export function workspaceTools(client: CloudClient | null) {
  return [
    {
      name: "workspace.setContext",
      description:
        "Set workspace context before skill list/get/test/pipeline ops. Scopes skills to the current repo by default. Requires MODELBOUND_API_KEY.",
      inputSchema: {
        type: "object",
        properties: {
          workspace_path: { type: "string", description: "Absolute path to workspace root." },
          repo_full_name: { type: "string", description: "org/repo parsed from git remote." },
          file_hints: {
            type: "array",
            items: { type: "string" },
            description: "Directories to scan for skill files.",
          },
        },
        required: ["workspace_path"],
      },
      handler: async (args: Record<string, unknown>) =>
        requireCloud(client).callTool("set_workspace_context", args),
    },
    {
      name: "sync.fromIde",
      description:
        "Sync a local skill file from the IDE to cloud and return a repo-linked skill UUID. Requires MODELBOUND_API_KEY.",
      inputSchema: {
        type: "object",
        properties: {
          repo_url: { type: "string" },
          branch: { type: "string" },
          source_ide: {
            type: "string",
            enum: ["cursor", "kiro", "claude", "vscode", "copilot", "windsurf", "modelbound"],
          },
          source_path: { type: "string" },
          body_md: { type: "string" },
        },
        required: ["source_ide", "source_path", "body_md"],
      },
      handler: async (args: Record<string, unknown>) =>
        requireCloud(client).callTool("sync_skill_from_ide", args),
    },
  ];
}
