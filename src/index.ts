#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { localTools } from "./tools/local.js";
import { cloudTools } from "./tools/cloud.js";
import { CloudClient } from "./proxy.js";

const cwd = process.cwd();
const cloud = CloudClient.fromEnv();
const tools = [
  ...localTools,
  ...cloudTools(cloud).map((t) => ({
    ...t,
    handler: async (args: unknown) => t.handler(args as any),
  })),
];

const server = new Server(
  { name: "modelbound-mcp", version: "0.1.0" },
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
