import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import type { IdeAdapter, CanonicalSkill } from "./types.js";
export { listAdapterFiles } from "./types.js";
export type { IdeAdapter, CanonicalSkill } from "./types.js";

const mdAdapter = (
  id: string,
  name: string,
  skillsDir: string,
  fileExt = ".md",
  detect?: (cwd: string) => boolean,
): IdeAdapter => ({
  id,
  name,
  skillsDir,
  fileExt,
  detect: detect ?? ((cwd) => fs.existsSync(path.join(cwd, skillsDir))),
  toCanonical: (raw): CanonicalSkill => {
    const parsed = matter(raw);
    return { frontmatter: parsed.data ?? {}, body: parsed.content.trim() };
  },
  fromCanonical: ({ frontmatter, body }) =>
    Object.keys(frontmatter).length
      ? matter.stringify(body, frontmatter)
      : body + "\n",
});

export const cursor: IdeAdapter = mdAdapter(
  "cursor",
  "Cursor",
  ".cursor/rules",
  ".mdc",
  (cwd) => fs.existsSync(path.join(cwd, ".cursor")),
);

export const claude: IdeAdapter = mdAdapter(
  "claude",
  "Claude Code",
  ".claude/skills",
  ".md",
  (cwd) => fs.existsSync(path.join(cwd, ".claude")),
);

export const kiro: IdeAdapter = mdAdapter(
  "kiro",
  "Kiro",
  ".kiro/skills",
  ".md",
  (cwd) => fs.existsSync(path.join(cwd, ".kiro")),
);

export const windsurf: IdeAdapter = mdAdapter(
  "windsurf",
  "Windsurf",
  ".windsurf/rules",
  ".md",
  (cwd) => fs.existsSync(path.join(cwd, ".windsurf")),
);

export const vscode: IdeAdapter = mdAdapter(
  "vscode-copilot",
  "VS Code / GitHub Copilot",
  ".github/copilot",
  ".md",
  (cwd) => fs.existsSync(path.join(cwd, ".github/copilot")),
);

export const amazonQ: IdeAdapter = mdAdapter(
  "amazon-q",
  "Amazon Q",
  ".amazonq/rules",
  ".md",
  (cwd) => fs.existsSync(path.join(cwd, ".amazonq")),
);

export const agentsMd: IdeAdapter = mdAdapter(
  "agents-md",
  "AGENTS.md (generic)",
  ".",
  ".md",
  (cwd) => fs.existsSync(path.join(cwd, "AGENTS.md")),
);

export const ALL_ADAPTERS: IdeAdapter[] = [
  cursor,
  claude,
  kiro,
  windsurf,
  vscode,
  amazonQ,
  agentsMd,
];

export function getAdapter(id: string): IdeAdapter | undefined {
  return ALL_ADAPTERS.find((a) => a.id === id);
}

export function detectAdapters(cwd: string): IdeAdapter[] {
  return ALL_ADAPTERS.filter((a) => a.detect(cwd));
}
