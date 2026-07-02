#!/usr/bin/env node
/** Push/pull via modelbound-mcp cloud proxy (stdio tool handlers). */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mcpRoot = path.resolve(__dirname, "..");

function loadKey() {
  for (const f of [
    path.join(mcpRoot, "../modelbound-cli/.env"),
    path.join(mcpRoot, ".env"),
  ]) {
    if (!fs.existsSync(f)) continue;
    for (const line of fs.readFileSync(f, "utf8").split("\n")) {
      const m = line.match(/^(MB_TOKEN|MODELBOUND_API_KEY)=(.+)$/);
      if (m) return m[2].trim();
    }
  }
  throw new Error("Missing API key");
}

const { CloudClient } = await import(pathToFileURL(path.join(mcpRoot, "dist/proxy.js")).href);
const { cloudTools } = await import(pathToFileURL(path.join(mcpRoot, "dist/tools/cloud.js")).href);

const apiKey = loadKey();
const client = new CloudClient(apiKey);
const tools = cloudTools(client);
const byName = Object.fromEntries(tools.map((t) => [t.name, t]));

const [cmd, ...rest] = process.argv.slice(2);

if (cmd === "push") {
  const [rel, repo] = rest;
  const cwd = process.cwd();
  const body = fs.readFileSync(path.join(cwd, rel), "utf8");
  const slug = path.basename(rel).replace(/\.md$/i, "");
  await client.callTool("set_workspace_context", {
    workspace_path: cwd,
    repo_full_name: repo,
    file_hints: [".modelbound"],
  });
  const out = await byName["cloud.pushSkill"].handler({
    slug: rel.replace(/^\.\//, ""),
    title: slug,
    body_md: body,
  });
  console.log(JSON.stringify(out));
} else if (cmd === "pull") {
  const [slug, destDir] = rest;
  const out = await byName["cloud.pullSkill"].handler({ slug });
  let body = "";
  if (typeof out === "string") {
    body = out;
  } else if (out && typeof out === "object") {
    const text = out.content?.[0]?.text ?? "";
    try {
      const j = JSON.parse(text);
      body = j.body_md ?? j.body ?? text;
    } catch {
      body = text;
    }
  }
  if (!body.trim()) throw new Error(`Empty pull for slug ${slug}`);
  fs.mkdirSync(destDir, { recursive: true });
  const dest = path.join(destDir, `${slug}.md`);
  fs.writeFileSync(dest, body);
  console.log(`Wrote ${dest} (${body.length} bytes)`);
} else {
  console.error("Usage: cloud-sync-test.mjs push <rel-path> <org/repo> | pull <slug> <dest-dir>");
  process.exit(1);
}
