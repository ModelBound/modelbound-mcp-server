import assert from "node:assert/strict";
import test from "node:test";
import { allMcpTools } from "./toolRegistry.js";

/** Mirrors modelbound-cli + extension parity (see docs/PARITY.md). */
const CLI_PARITY_TOOLS = [
  "check_harness",
  "report_run",
  "skill.report_outcome",
  "skill.reliability",
  "pipeline.run",
  "pipeline.status",
  "pipeline.config",
  "optimization.run",
  "optimization.health",
  "skill.test",
  "skill.versions",
  "skill.findings",
  "eval.listCases",
  "skills.scaffold",
  "skills.lint",
  "skills.trust",
  "skills.reviewGate",
  "ide.detectLayout",
];

test("registry exposes CLI-parity cloud and local tools", () => {
  const names = new Set(allMcpTools(null).map((t) => t.name));
  const missing = CLI_PARITY_TOOLS.filter((n) => !names.has(n));
  assert.deepEqual(missing, [], `missing tools: ${missing.join(", ")}`);
});

test("registry tool names are unique", () => {
  const names = allMcpTools(null).map((t) => t.name);
  assert.equal(names.length, new Set(names).size, `duplicate: ${names.filter((n, i) => names.indexOf(n) !== i)}`);
});
