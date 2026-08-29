import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { scoreSkillTrust, SCANNER_VERSION } from "./skillTrust.js";
import { buildScopeConstraintBlock } from "./scopeSnippet.js";

const SCOPE = buildScopeConstraintBlock();

describe("SCANNER_VERSION", () => {
  it("is h5", () => {
    assert.equal(SCANNER_VERSION, "h5");
  });
});

describe("h5 slop findings", () => {
  it("flags missing task-scope limit", () => {
    const r = scoreSkillTrust({
      name: "x",
      description: "Triggered when user asks for help; does a bounded thing.",
      body_md: "# X\n\nDo the work.\n",
      allowed_tools: [],
    });
    assert.ok(r.findings.some((f) => f.message.includes("No task-scope limit")));
  });

  it("passes when scope block present", () => {
    const r = scoreSkillTrust({
      name: "x",
      description: "Triggered when user asks for help; does a bounded thing.",
      body_md: `# X\n${SCOPE}\n\nVerify with tests before finishing.\n`,
      allowed_tools: [],
    });
    assert.equal(r.findings.some((f) => f.message.includes("No task-scope limit")), false);
  });

  it("flags unbounded wording without limits", () => {
    const r = scoreSkillTrust({
      name: "x",
      description: "Triggered when user asks for help; does a bounded thing.",
      body_md: "# X\n\nBe comprehensive and refactor the entire codebase.\n",
      allowed_tools: [],
    });
    assert.ok(r.findings.some((f) => f.message.includes("Unbounded wording")));
  });

  it("does not penalize unbounded wording when hard limits exist", () => {
    const r = scoreSkillTrust({
      name: "x",
      description: "Triggered when user asks for help; does a bounded thing.",
      body_md: `# X\n${SCOPE}\n\nBe comprehensive within max 5 files.\n`,
      allowed_tools: [],
    });
    assert.equal(r.findings.some((f) => f.message.includes("Unbounded wording")), false);
  });

  it("info-only when no verification step", () => {
    const r = scoreSkillTrust({
      name: "x",
      description: "Triggered when user asks for help; does a bounded thing.",
      body_md: `# X\n${SCOPE}\n\nDo the work only.\n`,
      allowed_tools: [],
    });
    const f = r.findings.find((x) => x.message.includes("No verification step"));
    assert.ok(f);
    assert.equal(f?.severity, "info");
  });

  it("flags unapproved dependencies", () => {
    const r = scoreSkillTrust({
      name: "x",
      description: "Triggered when user asks for help; does a bounded thing.",
      body_md: `# X\n${SCOPE}\n\nRun npm install left-pad and verify tests.\n`,
      allowed_tools: [],
    });
    assert.ok(r.findings.some((f) => f.message.includes("Unapproved dependencies")));
  });

  it("passes dependencies with approval gate", () => {
    const r = scoreSkillTrust({
      name: "x",
      description: "Triggered when user asks for help; does a bounded thing.",
      body_md: `# X\n${SCOPE}\n\nAsk the user to approve, then npm install foo. Verify tests.\n`,
      allowed_tools: [],
    });
    assert.equal(r.findings.some((f) => f.message.includes("Unapproved dependencies")), false);
  });

  it("flags unbounded refactoring", () => {
    const r = scoreSkillTrust({
      name: "x",
      description: "Triggered when user asks for help; does a bounded thing.",
      body_md: "# X\n\nRefactor and clean up the module. Verify with review.\n",
      allowed_tools: [],
    });
    assert.ok(r.findings.some((f) => f.message.includes("Unbounded refactoring")));
  });
});
