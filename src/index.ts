#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { localTools } from "./tools/local.js";
import { cloudTools } from "./tools/cloud.js";
import { optimizationTools } from "./tools/optimization.js";
import { pipelineTools } from "./tools/pipeline.js";
import { skillOpsTools } from "./tools/skill-ops.js";
import { workspaceTools } from "./tools/workspace.js";
import { evalTools } from "./tools/eval.js";
import { CloudClient } from "./proxy.js";

const cwd = process.cwd();
const cloud = CloudClient.fromEnv();
type Tool = {
  name: string;
  description: string;
  inputSchema: unknown;
  handler: (args: any, ctx: { cwd: string }) => Promise<unknown>;
};

// Cloud-backed tool groups all share the same single-arg handler shape; wrap
// them so the registry can pass ctx uniformly without each group caring.
const wrapCloud = <T extends { handler: (args: any) => Promise<unknown> }>(t: T) => ({
  ...t,
  handler: async (args: any, _ctx: { cwd: string }) => t.handler(args),
});

const tools: Tool[] = [
  ...localTools(cloud),
  ...cloudTools(cloud).map(wrapCloud),
  ...optimizationTools(cloud).map(wrapCloud),
  ...workspaceTools(cloud).map(wrapCloud),
  ...pipelineTools(cloud).map(wrapCloud),
  ...skillOpsTools(cloud).map(wrapCloud),
  ...evalTools(cloud).map(wrapCloud),
];

const server = new Server(
  { name: "modelbound-mcp", version: "0.4.2" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: tools.map((t) => ({
    name: t.name,
    description: t.description,
    inputSchema: t.inputSchema,
  })),
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const tool = tools.find((t) => t.name === req.params.name);
  if (!tool) {
    return {
      isError: true,
      content: [{ type: "text", text: `Unknown tool: ${req.params.name}` }],
    };
  }
  try {
    const result = await (tool.handler as any)(req.params.arguments ?? {}, { cwd });
    return {
      content: [
        {
          type: "text",
          text: typeof result === "string" ? result : JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (err) {
    return {
      isError: true,
      content: [{ type: "text", text: (err as Error).message }],
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
