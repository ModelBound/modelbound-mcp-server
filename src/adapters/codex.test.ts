import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { codex, detectAdapters, listAdapterFiles } from "./index.js";

test("codex adapter detects and round-trips SKILL.md files", () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "modelbound-codex-"));
  const skillDir = path.join(cwd, ".codex", "skills", "social-review");
  const referencesDir = path.join(skillDir, "references");
  fs.mkdirSync(referencesDir, { recursive: true });

  const skillPath = path.join(skillDir, "SKILL.md");
  const raw = [
    "---",
    "name: social-review",
    "description: Review social drafts before publishing.",
    "---",
    "",
    "# Social Review",
    "",
    "Check drafts before publishing.",
    "",
  ].join("\n");

  fs.writeFileSync(skillPath, raw, "utf8");
  fs.writeFileSync(path.join(referencesDir, "notes.md"), "# Notes\n", "utf8");

  assert.deepEqual(detectAdapters(cwd).map((adapter) => adapter.id), ["codex"]);
  assert.deepEqual(listAdapterFiles(codex, cwd), [skillPath]);

  const canonical = codex.toCanonical(raw);
  assert.deepEqual(canonical.frontmatter, {
    name: "social-review",
    description: "Review social drafts before publishing.",
  });
  assert.equal(canonical.body, "# Social Review\n\nCheck drafts before publishing.");
  assert.match(codex.fromCanonical(canonical), /^---\nname: social-review\n/m);
});
