#!/usr/bin/env node
/**
 * Offline E2E for anti-slop: scope scaffold, trust h5, review lifecycle, CI gate.
 * Run: npm run build && node scripts/anti-slop-e2e.mjs
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");

let passed = 0;
let failed = 0;

function ok(name) {
  passed++;
  console.log(`  ✓ ${name}`);
}

function fail(name, err) {
  failed++;
  console.log(`  ✗ ${name}`);
  console.log(`    ${err instanceof Error ? err.message : err}`);
}

async function runTool(tools, name, args, ctx) {
  const tool = tools.find((t) => t.name === name);
  if (!tool) throw new Error(`Tool not registered: ${name}`);
  return tool.handler(args, ctx);
}

async function main() {
  console.log("anti-slop E2E (modelbound-mcp-server)\n");

  const fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), "mb-antislop-"));
  fs.mkdirSync(path.join(fixtureDir, ".cursor", "rules"), { recursive: true });
  const ctx = { cwd: fixtureDir };

  try {
    const { localTools } = await import(path.join(dist, "tools/local.js"));
    const tools = localTools(null);

    const skillRel = ".cursor/skills/e2e-skill/SKILL.md";

    // Scaffold with default scope
    const scaffolded = await runTool(
      tools,
      "skills.scaffold",
      {
        name: "e2e-skill",
        description: "Triggered when E2E runs; validates scoped skill scaffolding offline.",
        path: skillRel,
      },
      ctx,
    );
    if (!scaffolded.created) throw new Error("scaffold did not create skill");
    const raw = fs.readFileSync(path.join(fixtureDir, skillRel), "utf8");
    if (!raw.includes("## Scope Constraints")) throw new Error("scope block missing from scaffold");
    if (!raw.includes("<task-split>")) throw new Error("task-split missing from scaffold");
    ok("skills.scaffold injects scope block");

    // Trust h5
    const trust = await runTool(tools, "skills.trust", { path: skillRel }, ctx);
    if (trust.scanner_version !== "h5") throw new Error(`expected h5, got ${trust.scanner_version}`);
    if (typeof trust.trust_score !== "number") throw new Error("missing trust_score");
    ok("skills.trust returns h5 score");

    // Served payload on read
    const read = await runTool(tools, "skills.readLocal", { path: skillRel }, ctx);
    for (const field of ["trust_score", "scanner_version", "review_state", "review_meta"]) {
      if (read[field] === undefined && field !== "review_meta") {
        throw new Error(`readLocal missing ${field}`);
      }
    }
    if (read.scanner_version !== "h5") throw new Error("readLocal scanner_version not h5");
    if (read.review_state !== "draft") throw new Error(`expected draft, got ${read.review_state}`);
    ok("skills.readLocal returns served payload fields");

    // Review lifecycle
    await runTool(tools, "skills.reviewRequest", { path: skillRel }, ctx);
    let status = await runTool(tools, "skills.reviewStatus", { path: skillRel }, ctx);
    if (status.review_state !== "pending_review") throw new Error("request did not set pending_review");
    ok("skills.reviewRequest → pending_review");

    await runTool(
      tools,
      "skills.reviewApprove",
      { path: skillRel, reviewed_by: "e2e", notes: "automated" },
      ctx,
    );
    status = await runTool(tools, "skills.reviewStatus", { path: skillRel }, ctx);
    if (status.review_state !== "approved") throw new Error("approve failed");
    if (status.review_meta?.approved_trust == null) throw new Error("missing approved_trust");
    ok("skills.reviewApprove stores hash and trust");

    let gate = await runTool(tools, "skills.reviewGate", { path: skillRel }, ctx);
    if (gate.blocked || gate.ci_exit_code !== 0) throw new Error("gate should pass when approved");
    ok("skills.reviewGate passes when approved");

    // Edit body → draft
    const abs = path.join(fixtureDir, skillRel);
    fs.writeFileSync(abs, fs.readFileSync(abs, "utf8").replace("Workflow", "Workflow (edited)"), "utf8");
    status = await runTool(tools, "skills.reviewStatus", { path: skillRel }, ctx);
    if (status.review_state !== "draft") throw new Error("body edit should reset to draft");
    gate = await runTool(tools, "skills.reviewGate", { path: skillRel }, ctx);
    if (!gate.blocked || gate.ci_exit_code !== 1) throw new Error("gate should block when draft");
    ok("modified skill resets to draft and gate blocks");

    // Reject path on fresh skill
    const rejectRel = ".cursor/skills/reject-me/SKILL.md";
    await runTool(
      tools,
      "skills.scaffold",
      {
        name: "reject-me",
        description: "Triggered when testing reject flow; validates rejection state offline.",
        path: rejectRel,
      },
      ctx,
    );
    await runTool(tools, "skills.reviewReject", { path: rejectRel, notes: "no" }, ctx);
    status = await runTool(tools, "skills.reviewStatus", { path: rejectRel }, ctx);
    if (status.review_state !== "rejected") throw new Error("reject failed");
    ok("skills.reviewReject sets rejected");

    // Task budgets config
    const budgetsPath = path.join(fixtureDir, ".modelbound", "task-budgets.json");
    fs.mkdirSync(path.dirname(budgetsPath), { recursive: true });
    fs.writeFileSync(budgetsPath, JSON.stringify({ files: { max: 3 }, loc: { max: 100 }, features: { max: 1 } }), "utf8");
    const scoped = await runTool(
      tools,
      "skills.scaffold",
      {
        name: "custom-budget",
        description: "Triggered when custom budgets apply; checks config override offline.",
        path: ".cursor/skills/custom-budget/SKILL.md",
      },
      ctx,
    );
    const customRaw = fs.readFileSync(path.join(fixtureDir, scoped.path), "utf8");
    if (!customRaw.includes("Max files per task:** 3")) throw new Error("task-budgets.json override not applied");
    ok("task-budgets.json overrides scope defaults");
  } finally {
    fs.rmSync(fixtureDir, { recursive: true, force: true });
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
