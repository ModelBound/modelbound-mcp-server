// Example: print the team's AI resource hierarchy grouped by platform.
// Run with: MODELBOUND_API_KEY=mb_live_... npx tsx examples/resource-tree.ts
import { CloudClient } from "../src/proxy.js";

const client = CloudClient.fromEnv();
if (!client) {
  console.error("Set MODELBOUND_API_KEY to run this example.");
  process.exit(1);
}

const tree = await client.callTool("get_resource_tree", {});
console.log(JSON.stringify(tree, null, 2));
