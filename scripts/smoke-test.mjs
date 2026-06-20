#!/usr/bin/env node
/**
 * Smoke test for modelbound-mcp local tools, CLI, and (optionally) cloud proxy mappings.
 * Run: node scripts/smoke-test.mjs
 * Cloud tests require MODELBOUND_API_KEY in the environment.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");

const SAMPLE_SKILL = `---
name: smoke-test-skill
description: Temporary skill for MCP smoke tests
---

# Smoke Test Skill

Follow project conventions when editing code.

See [docs](../README.md) for more.

TODO: remove after testing
`;

let passed = 0;
let failed = 0;
let skipped = 0;

function ok(name) {
  passed++;
  console.log(`  ✓ ${name}`);
}

function fail(name, err) {
  failed++;
  console.log(`  ✗ ${name}`);
  console.log(`    ${err instanceof Error ? err.message : err}`);
}

function skip(name, reason) {
  skipped++;
  console.log(`  ○ ${name} (skipped: ${reason})`);
}

async function loadTools(cwd, apiKey) {
  const savedKey = process.env.MODELBOUND_API_KEY;
  if (apiKey) process.env.MODELBOUND_API_KEY = apiKey;
  else delete process.env.MODELBOUND_API_KEY;

  const { localTools } = await import(path.join(dist, "tools/local.js"));
  const { cloudTools } = await import(path.join(dist, "tools/cloud.js"));
  const { optimizationTools } = await import(path.join(dist, "tools/optimization.js"));
  const { pipelineTools } = await import(path.join(dist, "tools/pipeline.js"));
  const { skillOpsTools } = await import(path.join(dist, "tools/skill-ops.js"));
  const { workspaceTools } = await import(path.join(dist, "tools/workspace.js"));
  const { evalTools } = await import(path.join(dist, "tools/eval.js"));
  const { CloudClient } = await import(path.join(dist, "proxy.js"));

  const cloud = CloudClient.fromEnv();
  const toolsNoCloud = [...localTools(null)];
  const wrapCloud = (t) => ({
    ...t,
    handler: async (args, _ctx) => t.handler(args),
  });

  const bundle = {
    cwd,
    cloud,
    toolsNoCloud,
    tools: [
      ...localTools(cloud),
      ...cloudTools(cloud).map(wrapCloud),
      ...optimizationTools(cloud).map(wrapCloud),
      ...workspaceTools(cloud).map(wrapCloud),
      ...pipelineTools(cloud).map(wrapCloud),
      ...skillOpsTools(cloud).map(wrapCloud),
      ...evalTools(cloud).map(wrapCloud),
    ],
  };

  if (savedKey === undefined) delete process.env.MODELBOUND_API_KEY;
  else process.env.MODELBOUND_API_KEY = savedKey;

  return bundle;
}

async function runTool(tools, name, args, ctx) {
  const tool = tools.find((t) => t.name === name);
  if (!tool) throw new Error(`Tool not registered: ${name}`);
  return tool.handler(args, ctx);
}

function runCli(args, cwd) {
  return spawnSync(process.execPath, [path.join(dist, "cli.js"), ...args], {
    cwd,
    encoding: "utf8",
  });
}

async function testLocalTools(fixtureDir, tools, ctx, toolsNoCloud) {
  console.log("\nLocal MCP tools");

  try {
    const layout = await runTool(tools, "ide.detectLayout", {}, ctx);
    if (!layout.detected?.some((a) => a.id === "cursor")) throw new Error("cursor adapter not detected");
    ok("ide.detectLayout");
  } catch (e) {
    fail("ide.detectLayout", e);
  }

  const relPath = ".cursor/rules/smoke-test.mdc";

  for (const [name, fn] of [
    ["skills.listLocal", () => runTool(tools, "skills.listLocal", {}, ctx)],
    [
      "skills.writeLocal",
      () => runTool(tools, "skills.writeLocal", { path: relPath, contents: SAMPLE_SKILL }, ctx),
    ],
    ["skills.readLocal", () => runTool(tools, "skills.readLocal", { path: relPath }, ctx)],
    ["skills.lint", () => runTool(tools, "skills.lint", { path: relPath }, ctx)],
    ["skills.validateFormat", () => runTool(tools, "skills.validateFormat", { path: relPath }, ctx)],
    [
      "skills.convert",
      () =>
        runTool(tools, "skills.convert", {
          path: relPath,
          from: "cursor",
          to: "claude",
        }, ctx),
    ],
    [
      "skills.diff (no api key)",
      () => runTool(toolsNoCloud, "skills.diff", { path: relPath, slug: "test-slug" }, ctx),
    ],
  ]) {
    try {
      const result = await fn();
      if (name === "skills.diff (no api key)" && !result.local_only) {
        throw new Error("expected local_only without API key");
      }
      ok(name);
    } catch (e) {
      fail(name, e);
    }
  }
}

function testCli(fixtureDir) {
  console.log("\nCLI subcommands");

  const cases = [
    ["detect", ["detect"], (r) => r.stdout.includes("cursor")],
    ["ls", ["ls"], (r) => r.stdout.includes("smoke-test.mdc")],
    ["validate", ["validate", ".cursor/rules/smoke-test.mdc"], (r) => r.status === 0],
    ["lint", ["lint", ".cursor/rules/smoke-test.mdc"], (r) => r.status === 0],
    [
      "convert",
      ["convert", "--from", "cursor", "--to", "claude", ".cursor/rules/smoke-test.mdc"],
      (r) => r.status === 0 && r.stdout.includes("Smoke Test Skill"),
    ],
    ["help", ["--help"], (r) => r.status === 0 && r.stdout.includes("Subcommands")],
  ];

  for (const [name, args, check] of cases) {
    const result = runCli(args, fixtureDir);
    try {
      if (!check(result)) {
        throw new Error(result.stderr || result.stdout || `exit ${result.status}`);
      }
      ok(name);
    } catch (e) {
      fail(name, e);
    }
  }
}

async function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms),
    ),
  ]);
}

async function testCloudTools(tools, ctx, cloud) {
  console.log("\nCloud MCP tools (live API)");

  if (!cloud) {
    skip("all cloud tools", "MODELBOUND_API_KEY not set");
    return;
  }

  const readOnly = [
    ["cloud.listSkills", {}],
    ["cloud.resourceTree", {}],
    ["cloud.search", { q: "test" }],
    ["optimization.health", {}],
    ["eval.listCases", {}],
  ];

  for (const [name, args] of readOnly) {
    try {
      await runTool(tools, name, args, ctx);
      ok(name);
    } catch (e) {
      fail(name, e);
    }
  }

  // Pull/skill ops before workspace scoping — setContext scopes listSkills to the fixture repo.
  try {
    const listed = await runTool(tools, "cloud.listSkills", {});
    const first = Array.isArray(listed) ? listed[0] : listed?.skills?.[0];
    if (first?.id) {
      await runTool(tools, "cloud.pullSkill", { slug: first.id }, ctx);
      ok("cloud.pullSkill");
      await runTool(tools, "skill.versions", { skill_id: first.id, limit: 1 }, ctx);
      ok("skill.versions");
      await runTool(tools, "skill.testCases", { skill_id: first.id }, ctx);
      ok("skill.testCases");
      await runTool(tools, "skill.findings", { skill_id: first.id }, ctx);
      ok("skill.findings");
      await runTool(tools, "pipeline.status", { skill_id: first.id, limit: 1 }, ctx);
      ok("pipeline.status");
      await runTool(tools, "pipeline.config", { skill_id: first.id }, ctx);
      ok("pipeline.config (read)");
      await withTimeout(
        runTool(tools, "optimization.dryRun", { skill_id: first.id }, ctx),
        60_000,
        "optimization.dryRun",
      );
      ok("optimization.dryRun");
      if (first.source_path) {
        const diff = await runTool(
          tools,
          "skills.diff",
          { path: ".cursor/rules/smoke-test.mdc", slug: first.id },
          ctx,
        );
        if (typeof diff.identical !== "boolean") throw new Error("skills.diff missing identical flag");
        ok("skills.diff (with api key)");
      }
    } else {
      skip("cloud.pullSkill", "no skills in library");
    }
  } catch (e) {
    fail("cloud.pullSkill + skill ops", e);
  }

  try {
    await runTool(tools, "workspace.setContext", { workspace_path: ctx.cwd });
    ok("workspace.setContext");
  } catch (e) {
    fail("workspace.setContext", e);
  }
}

async function main() {
  console.log("modelbound-mcp smoke test\n");

  const fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), "mb-mcp-"));
  fs.mkdirSync(path.join(fixtureDir, ".cursor/rules"), { recursive: true });

  try {
    const apiKey = process.env.MODELBOUND_API_KEY;
    const { tools, toolsNoCloud, cloud } = await loadTools(fixtureDir, apiKey);
    const ctx = { cwd: fixtureDir };

    await testLocalTools(fixtureDir, tools, ctx, toolsNoCloud);
    testCli(fixtureDir);
    await testCloudTools(tools, ctx, cloud);
  } finally {
    fs.rmSync(fixtureDir, { recursive: true, force: true });
  }

  console.log(`\n${passed} passed, ${failed} failed, ${skipped} skipped`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
