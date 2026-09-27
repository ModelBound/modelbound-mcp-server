import { CloudClient } from "./proxy.js";
import { localTools } from "./tools/local.js";
import { cloudTools } from "./tools/cloud.js";
import { optimizationTools } from "./tools/optimization.js";
import { pipelineTools } from "./tools/pipeline.js";
import { skillOpsTools } from "./tools/skill-ops.js";
import { workspaceTools } from "./tools/workspace.js";
import { evalTools } from "./tools/eval.js";
import { outcomesTools } from "./tools/outcomes.js";
import { harnessTools } from "./tools/harness.js";
import { tracingTools, traceWrap } from "./tools/tracing.js";

export type McpTool = {
  name: string;
  description: string;
  inputSchema: unknown;
  handler: (args: any, ctx: { cwd: string }) => Promise<unknown>;
};

const wrapCloud = <T extends { handler: (args: any) => Promise<unknown> }>(t: T) => ({
  ...t,
  handler: async (args: any, _ctx: { cwd: string }) => t.handler(args),
});

const wrapCloudTraced = <T extends { name: string; handler: (args: any) => Promise<unknown> }>(t: T) =>
  traceWrap(wrapCloud(t));

/** Full MCP tool surface (local + cloud). Used by stdio server and registry tests. */
export function allMcpTools(cloud: CloudClient | null = CloudClient.fromEnv()): McpTool[] {
  return [
    ...localTools(cloud),
    ...cloudTools(cloud).map(wrapCloudTraced),
    ...optimizationTools(cloud).map(wrapCloudTraced),
    ...workspaceTools(cloud).map(wrapCloudTraced),
    ...pipelineTools(cloud).map(wrapCloudTraced),
    ...skillOpsTools(cloud).map(wrapCloudTraced),
    ...evalTools(cloud).map(wrapCloudTraced),
    ...outcomesTools(cloud).map(wrapCloudTraced),
    ...harnessTools(cloud).map(wrapCloudTraced),
    ...tracingTools(),
  ];
}
